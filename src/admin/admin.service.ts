import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicStatusDto, ClinicStatus } from './dto/update-clinic-status.dto';
import { AdminStatsDto } from './dto/admin-stats.dto';
import { UserRole } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    private emailService: EmailService,
  ) {}

  /**
   * Verifica se o usuário é admin
   */
  async verifyAdminRole(userId: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Acesso negado. Apenas administradores podem realizar esta ação.');
    }
  }

  /**
   * Criar uma nova clínica
   */
  async createClinic(adminId: number, createClinicDto: CreateClinicDto) {
    console.log('🏥 [CREATE CLINIC] Iniciando criação de clínica:', {
      adminId,
      clinicName: createClinicDto.name,
      clinicEmail: createClinicDto.email,
      clinicNif: createClinicDto.nif
    });

    await this.verifyAdminRole(adminId);

    const { password, responsibleCrm, ...clinicData } = createClinicDto;

    // Mapear o campo responsibleCrm corretamente
    const clinicDataWithCrm = {
      ...clinicData,
      responsibleCrm: responsibleCrm || null
    };

    console.log('🔍 [CREATE CLINIC] Verificando se email já existe:', createClinicDto.email);
    // Verificar se o email já está em uso
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createClinicDto.email }
    });

    if (existingUser) {
      console.log('❌ [CREATE CLINIC] Email já existe:', createClinicDto.email);
      throw new ConflictException('Este email já está em uso. Por favor, use outro email.');
    }

    console.log('🔍 [CREATE CLINIC] Verificando se NIF já existe:', createClinicDto.nif);
    // Verificar se NIF já existe (apenas clínicas não deletadas)
    const existingClinic = await this.prisma.clinic.findFirst({
      where: {
        nif: createClinicDto.nif,
        deleted: false
      }
    });

    if (existingClinic) {
      console.log('❌ [CREATE CLINIC] NIF já existe:', createClinicDto.nif);
      throw new ConflictException('Este NIF já está em uso. Por favor, use outro NIF.');
    }

    console.log('🔐 [CREATE CLINIC] Gerando hash da senha...');
    // Hash da senha
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('💾 [CREATE CLINIC] Iniciando transação para criar usuário e clínica...');
    // Criar usuário e clínica em uma transação
    let clinic;
    try {
      clinic = await this.prisma.$transaction(async (tx) => {
      console.log('👤 [CREATE CLINIC] Criando usuário:', {
        name: createClinicDto.name,
        email: createClinicDto.email,
        role: 'CLINIC'
      });

      // Criar o usuário
      const user = await tx.user.create({
        data: {
          email: createClinicDto.email,
          password: hashedPassword,
          name: createClinicDto.name,
          birthDate: new Date('1990-01-01'), // Data padrão para clínicas
          role: UserRole.CLINIC,
          medicalHistory: {
            create: {
              existingConditions: [],
              familyHistory: [],
              medications: [],
            },
          },
          preferences: {
            create: {
              notificationsEnabled: true,
              reminderFrequency: 'daily',
              language: 'pt',
            },
          },
        },
      });

      console.log('✅ [CREATE CLINIC] Usuário criado com ID:', user.id);

      console.log('🏥 [CREATE CLINIC] Criando clínica:', {
        name: clinicDataWithCrm.name,
        nif: clinicDataWithCrm.nif,
        userId: user.id,
        status: 'APPROVED'
      });

      // Criar clínica
      return tx.clinic.create({
        data: {
          ...clinicDataWithCrm,
          userId: user.id,
          status: ClinicStatus.APPROVED, // Admin cria já aprovada
          approvedBy: adminId,
          approvedAt: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          approver: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
    });
    } catch (error) {
      // Tratar erros de campos únicos do Prisma
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0];
        if (field === 'email') {
          throw new ConflictException('Este email já está em uso. Por favor, use outro email.');
        } else if (field === 'nif') {
          throw new ConflictException('Este NIF já está em uso. Por favor, use outro NIF.');
        } else if (field === 'responsibleBi') {
          throw new ConflictException('Este BI já está em uso. Por favor, use outro BI.');
        } else {
          throw new ConflictException('Já existe um registro com estes dados. Verifique os campos únicos.');
        }
      }

      // Re-lançar outros erros
      throw error;
    }

    console.log('✅ [CREATE CLINIC] Clínica criada com sucesso:', {
      clinicId: clinic.id,
      clinicName: clinic.name,
      userId: clinic.userId,
      status: clinic.status
    });

    // Notificar outros admins sobre nova clínica criada
    try {
      console.log('📧 [CREATE CLINIC] Enviando notificação para admins...');
      await this.notificationsService.notifyAdmins(
        '🏥 Nova Clínica Criada',
        `Uma nova clínica foi criada: ${clinic.name} (${clinic.email})`,
        'success',
        true,
        'Nova Clínica Criada - Kumona Vision Care'
      );
      console.log('✅ [CREATE CLINIC] Notificação enviada com sucesso');
    } catch (error) {
      console.error('❌ [CREATE CLINIC] Erro ao notificar admins sobre nova clínica:', error);
    }

    // Enviar notificação de boas-vindas para a clínica
    try {
      console.log('🎉 [CREATE CLINIC] Enviando notificação de boas-vindas para a clínica...');
      await this.notificationsService.createNotification(
        clinic.userId,
        '🎉 Bem-vindo ao Kumona Vision Care!',
        `Olá ${clinic.name}! Sua clínica foi criada com sucesso e já está aprovada. Você pode começar a usar nossa plataforma imediatamente. Explore todas as funcionalidades disponíveis para oferecer o melhor cuidado aos seus pacientes.`,
        'success',
        true,
        'Bem-vindo ao Kumona Vision Care'
      );
      console.log('✅ [CREATE CLINIC] Notificação de boas-vindas enviada com sucesso');
    } catch (error) {
      console.error('❌ [CREATE CLINIC] Erro ao enviar notificação de boas-vindas:', error);
    }

    console.log('🎉 [CREATE CLINIC] Processo concluído com sucesso');
    return clinic;
  }

  /**
   * Listar todas as clínicas
   */
  async getAllClinics(adminId: number, status?: ClinicStatus) {
    await this.verifyAdminRole(adminId);

    const where = {
      deleted: false,
      ...(status ? { status } : {})
    };

    return this.prisma.clinic.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
          }
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            patients: true,
            patientDiagnoses: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * Obter detalhes de uma clínica específica
   */
  async getClinicById(adminId: number, clinicId: number) {
    await this.verifyAdminRole(adminId);

    const clinic = await this.prisma.clinic.findUnique({
      where: {
        id: clinicId,
        deleted: false
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true
          }
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        patients: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            patients: true,
            patientDiagnoses: true
          }
        }
      }
    });

    if (!clinic) {
      throw new NotFoundException('Clínica não encontrada');
    }

    return clinic;
  }

  /**
   * Obter detalhes de uma clínica específica com estatísticas
   */
  async getClinicByIdWithStats(adminId: number, clinicId: number) {
    await this.verifyAdminRole(adminId);

    const clinic = await this.prisma.clinic.findUnique({
      where: {
        id: clinicId,
        deleted: false
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            phone: true,
            profileImage: true
          }
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        patients: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            patients: true,
            patientDiagnoses: true
          }
        }
      }
    });

    if (!clinic) {
      throw new NotFoundException('Clínica não encontrada');
    }

    // Buscar estatísticas adicionais
    const [validatedDiagnoses, activeUsers] = await Promise.all([
      this.prisma.patientDiagnosis.count({
        where: {
          clinicId: clinicId,
          validated: true
        }
      }),
      this.prisma.user.count({
        where: {
          clinic: {
            id: clinicId
          },
          deleted: false
        }
      })
    ]);

    return {
      ...clinic,
      stats: {
        totalDiagnoses: clinic._count.patientDiagnoses,
        totalPatients: clinic._count.patients,
        validatedDiagnoses,
        activeUsers
      }
    };
  }

  /**
   * Obter detalhes de um usuário específico com estatísticas
   */
  async getUserByIdWithStats(adminId: number, userId: number) {
    await this.verifyAdminRole(adminId);

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deleted: false },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            status: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true
          }
        },
        _count: {
          select: {
            diagnoses: true,
            patients: true
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Buscar estatísticas adicionais
    let stats = null;
    if (user.role === UserRole.CLINIC && user.clinic) {
      // Para clínicas, contar diagnósticos de pacientes
      const totalDiagnoses = await this.prisma.patientDiagnosis.count({
        where: {
          clinicId: user.clinic.id
        }
      });

      const validatedDiagnoses = await this.prisma.patientDiagnosis.count({
        where: {
          clinicId: user.clinic.id,
          validated: true
        }
      });

      stats = {
        totalDiagnoses,
        totalPatients: user._count.patients,
        validatedDiagnoses
      };
    } else if (user.role === UserRole.USER) {
      // Para usuários individuais, contar diagnósticos pessoais
      stats = {
        totalDiagnoses: user._count.diagnoses,
        totalPatients: 0,
        validatedDiagnoses: 0
      };
    }

    // Remover senha do retorno
    const { password, ...userWithoutPassword } = user;

    return {
      ...userWithoutPassword,
      stats
    };
  }

  /**
   * Atualizar status de uma clínica
   */
  async updateClinicStatus(adminId: number, clinicId: number, updateStatusDto: UpdateClinicStatusDto) {
    await this.verifyAdminRole(adminId);

    const clinic = await this.prisma.clinic.findUnique({
      where: {
        id: clinicId,
        deleted: false
      }
    });

    if (!clinic) {
      throw new NotFoundException('Clínica não encontrada');
    }

    const updatedClinic = await this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        status: updateStatusDto.status,
        approvedBy: updateStatusDto.status === ClinicStatus.APPROVED ? adminId : clinic.approvedBy,
        approvedAt: updateStatusDto.status === ClinicStatus.APPROVED ? new Date() : clinic.approvedAt
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Se a clínica foi suspensa ou rejeitada, atualizar role do usuário de volta para USER
    if (updateStatusDto.status === ClinicStatus.SUSPENDED || updateStatusDto.status === ClinicStatus.REJECTED) {
      await this.prisma.user.update({
        where: { id: clinic.userId },
        data: { role: UserRole.USER }
      });
    }

    // Notificar outros admins sobre mudança de status
    try {
      const statusMessages = {
        [ClinicStatus.APPROVED]: 'aprovada',
        [ClinicStatus.REJECTED]: 'rejeitada',
        [ClinicStatus.SUSPENDED]: 'suspensa',
        [ClinicStatus.PENDING]: 'colocada em análise'
      };

      await this.notificationsService.notifyAdmins(
        '🏥 Status de Clínica Alterado',
        `A clínica ${clinic.name} foi ${statusMessages[updateStatusDto.status]}`,
        updateStatusDto.status === ClinicStatus.APPROVED ? 'success' :
        updateStatusDto.status === ClinicStatus.REJECTED || updateStatusDto.status === ClinicStatus.SUSPENDED ? 'warning' : 'info',
        true,
        'Status de Clínica Alterado - Kumona Vision Care'
      );
    } catch (error) {
      console.error('Erro ao notificar admins sobre mudança de status da clínica:', error);
    }

    // Notificar a clínica sobre mudança de status por email
    try {
      const statusEmailMessages = {
        [ClinicStatus.APPROVED]: {
          subject: 'Clínica Aprovada - Kumona Vision Care',
          message: `Parabéns! Sua clínica "${clinic.name}" foi aprovada!\n\nAgora você tem acesso completo ao sistema Kumona Vision Care e pode:\n- Gerenciar pacientes\n- Realizar diagnósticos\n- Acessar relatórios completos\n- Utilizar todas as funcionalidades do sistema\n\nFaça login em sua conta para começar a usar todos os recursos disponíveis.\n\nBem-vindo ao Kumona Vision Care!`
        },
        [ClinicStatus.REJECTED]: {
          subject: 'Registro de Clínica - Kumona Vision Care',
          message: `Informamos que o registro da clínica "${clinic.name}" não foi aprovado.\n\nMotivo: ${updateStatusDto.notes || 'Não especificado'}\n\nSe você acredita que houve um erro ou deseja mais informações, entre em contato conosco através do suporte.\n\nObrigado pelo interesse no Kumona Vision Care.`
        },
        [ClinicStatus.SUSPENDED]: {
          subject: 'Clínica Suspensa - Kumona Vision Care',
          message: `Informamos que sua clínica "${clinic.name}" foi temporariamente suspensa.\n\nMotivo: ${updateStatusDto.notes || 'Não especificado'}\n\nDurante o período de suspensão, o acesso ao sistema estará limitado. Entre em contato conosco através do suporte para resolver esta situação.\n\nEquipe Kumona Vision Care`
        },
        [ClinicStatus.PENDING]: {
          subject: 'Clínica em Análise - Kumona Vision Care',
          message: `Sua clínica "${clinic.name}" está novamente em análise.\n\nMotivo: ${updateStatusDto.notes || 'Revisão solicitada'}\n\nVocê será notificado assim que a análise for concluída.\n\nObrigado pela paciência.`
        }
      };

      const emailData = statusEmailMessages[updateStatusDto.status];
      if (emailData) {
        await this.emailService.sendNotificationEmail(
          clinic.email,
          emailData.subject,
          emailData.message,
          clinic.name
        );
        console.log(`✅ [UPDATE CLINIC STATUS] Email enviado para clínica ${clinic.name} sobre mudança de status para ${updateStatusDto.status}`);
      }
    } catch (error) {
      console.error('❌ [UPDATE CLINIC STATUS] Erro ao enviar email para clínica sobre mudança de status:', error);
    }

    return updatedClinic;
  }

  /**
   * Deletar clínica (soft delete)
   */
  async deleteClinic(adminId: number, clinicId: number) {
    await this.verifyAdminRole(adminId);

    // Verificar se a clínica existe e não está deletada
    const clinic = await this.prisma.clinic.findUnique({
      where: {
        id: clinicId,
        deleted: false
      },
      include: { user: true }
    });

    if (!clinic) {
      throw new NotFoundException('Clínica não encontrada');
    }

    // Soft delete da clínica e usuário associado em transação
    await this.prisma.$transaction(async (tx) => {
      // Soft delete da clínica
      await tx.clinic.update({
        where: { id: clinicId },
        data: { deleted: true }
      });

      // Soft delete do usuário associado
      if (clinic.userId) {
        await tx.user.update({
          where: { id: clinic.userId },
          data: { deleted: true }
        });
      }
    });

    // Notificar outros admins sobre a exclusão
    try {
      await this.notificationsService.notifyAdmins(
        '🗑️ Clínica Removida',
        `A clínica ${clinic.name} (${clinic.email}) foi removida do sistema`,
        'warning',
        true,
        'Clínica Removida - Kumona Vision Care'
      );
    } catch (error) {
      console.error('Erro ao notificar admins sobre exclusão de clínica:', error);
    }

    return { message: 'Clínica deletada com sucesso' };
  }

  /**
   * Suspender clínica (usando o status SUSPENDED)
   */
  async suspendClinic(adminId: number, clinicId: number, reason?: string) {
    await this.verifyAdminRole(adminId);

    // Verificar se a clínica existe e não está deletada
    const clinic = await this.prisma.clinic.findFirst({
      where: {
        id: clinicId,
        deleted: false
      },
      include: { user: true }
    });

    if (!clinic) {
      throw new NotFoundException('Clínica não encontrada');
    }

    if (clinic.status === ClinicStatus.SUSPENDED) {
      throw new BadRequestException('Clínica já está suspensa');
    }

    // Atualizar status para SUSPENDED
    const updatedClinic = await this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        status: ClinicStatus.SUSPENDED
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Notificar a clínica sobre a suspensão
    try {
      await this.notificationsService.createNotification(
        clinic.userId,
        '⚠️ Clínica Suspensa',
        `Sua clínica foi suspensa. Motivo: ${reason || 'Suspensão administrativa'}. Entre em contato com o suporte para mais informações.`,
        'warning',
        true,
        'Clínica Suspensa - Kumona Vision Care'
      );
    } catch (error) {
      console.error('Erro ao notificar clínica sobre suspensão:', error);
    }

    // Notificar outros admins sobre a suspensão
    try {
      await this.notificationsService.notifyAdmins(
        '⚠️ Clínica Suspensa',
        `A clínica ${clinic.name} (${clinic.email}) foi suspensa. Motivo: ${reason || 'Suspensão administrativa'}`,
        'warning',
        true,
        'Clínica Suspensa - Kumona Vision Care'
      );
    } catch (error) {
      console.error('Erro ao notificar admins sobre suspensão de clínica:', error);
    }

    return updatedClinic;
  }

  /**
   * Obter estatísticas administrativas
   */
  async getAdminStats(adminId: number, clinicId?: number): Promise<AdminStatsDto> {
    await this.verifyAdminRole(adminId);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Filtros condicionais por clínica
    const clinicFilter = clinicId ? { clinicId } : {};
    const patientFilter = clinicId ? { clinicId } : {};

    const [
      totalUsers,
      totalClinics,
      clinicsByStatus,
      totalPatients,
      totalDiagnoses,
      validatedDiagnoses,
      specialistFeedbacks,
      newUsersThisMonth,
      newDiagnosesThisMonth,
      diagnosisByCondition,
      diagnosisBySeverity
    ] = await Promise.all([
      this.prisma.user.count({ where: { deleted: false } }),
      clinicId ? 1 : this.prisma.clinic.count(), // Se filtrado por clínica, sempre 1
      this.prisma.clinic.groupBy({
        by: ['status'],
        _count: true,
        ...(clinicId && { where: { id: clinicId } })
      }),
      this.prisma.patient.count({ where: patientFilter }),
      this.prisma.patientDiagnosis.count({ where: clinicFilter }),
      this.prisma.patientDiagnosis.count({ where: { validated: true, ...clinicFilter } }),
      this.prisma.specialistFeedback.count(),
      this.prisma.user.count({
        where: {
          createdAt: { gte: startOfMonth },
          deleted: false
        }
      }),
      this.prisma.patientDiagnosis.count({
        where: {
          createdAt: { gte: startOfMonth },
          ...clinicFilter
        }
      }),
      this.prisma.patientDiagnosis.groupBy({
        by: ['condition'],
        where: clinicFilter,
        _count: true
      }),
      this.prisma.patientDiagnosis.groupBy({
        by: ['severity'],
        where: clinicFilter,
        _count: true
      })
    ]);

    const statusCounts = clinicsByStatus.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<string, number>);

    const conditionCounts = diagnosisByCondition.reduce((acc, item) => {
      acc[item.condition] = item._count;
      return acc;
    }, {} as Record<string, number>);

    const severityCounts = diagnosisBySeverity.reduce((acc, item) => {
      acc[item.severity] = item._count;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalUsers,
      totalClinics,
      pendingClinics: statusCounts[ClinicStatus.PENDING] || 0,
      approvedClinics: statusCounts[ClinicStatus.APPROVED] || 0,
      rejectedClinics: statusCounts[ClinicStatus.REJECTED] || 0,
      suspendedClinics: statusCounts[ClinicStatus.SUSPENDED] || 0,
      totalPatients,
      totalDiagnoses,
      validatedDiagnoses,
      specialistFeedbacks,
      newUsersThisMonth,
      newDiagnosesThisMonth,
      diagnosisByCondition: conditionCounts,
      diagnosisBySeverity: severityCounts
    };
  }

  /**
   * Listar todos os usuários
   */
  async getAllUsers(adminId: number, role?: UserRole) {
    await this.verifyAdminRole(adminId);

    const where = role ? { role, deleted: false } : { deleted: false };

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        profileImage: true,
        createdAt: true,
        updatedAt: true,
        clinic: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        _count: {
          select: {
            diagnoses: true,
            patients: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * Promover usuário para admin
   */
  async promoteToAdmin(adminId: number, userId: number) {
    await this.verifyAdminRole(adminId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Usuário já é administrador');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role: UserRole.ADMIN },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true
      }
    });

    // Notificar outros admins sobre nova promoção
    try {
      await this.notificationsService.notifyAdmins(
        '👑 Novo Administrador',
        `${user.name} (${user.email}) foi promovido para administrador`,
        'success',
        true,
        'Novo Administrador - Kumona Vision Care'
      );
    } catch (error) {
      console.error('Erro ao notificar admins sobre nova promoção:', error);
    }

    // Notificar o usuário promovido
    try {
      await this.notificationsService.createNotification(
        userId,
        '👑 Parabéns! Você foi promovido',
        'Você agora é um administrador do sistema Kumona Vision Care. Acesse o painel administrativo para gerenciar o sistema.',
        'success',
        true,
        'Promoção para Administrador - Kumona Vision Care'
      );
    } catch (error) {
      console.error('Erro ao notificar usuário sobre promoção:', error);
    }

    return updatedUser;
  }

  /**
   * Deletar usuário (soft delete)
   */
  async deleteUser(adminId: number, userId: number) {
    await this.verifyAdminRole(adminId);

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
        deleted: false
      },
      include: {
        clinic: true
      }
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Não permitir deletar outros admins
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Não é possível deletar outros administradores');
    }

    // Não permitir deletar o próprio usuário
    if (user.id === adminId) {
      throw new BadRequestException('Não é possível deletar seu próprio usuário');
    }

    // Soft delete em transação
    await this.prisma.$transaction(async (tx) => {
      // Se o usuário tem uma clínica associada, fazer soft delete da clínica também
      if (user.clinic) {
        await tx.clinic.update({
          where: { id: user.clinic.id },
          data: { deleted: true }
        });
      }

      // Soft delete do usuário
      await tx.user.update({
        where: { id: userId },
        data: { deleted: true }
      });
    });

    // Notificar outros admins sobre a exclusão
    try {
      await this.notificationsService.notifyAdmins(
        '🗑️ Usuário Removido',
        `O usuário ${user.name} (${user.email}) foi removido do sistema`,
        'warning',
        true,
        'Usuário Removido - Kumona Vision Care'
      );
    } catch (error) {
      console.error('Erro ao notificar admins sobre exclusão de usuário:', error);
    }

    return { message: 'Usuário deletado com sucesso' };
  }



  /**
   * Obter relatório geral do sistema
   */
  async getSystemOverviewReport(adminId: number) {
    await this.verifyAdminRole(adminId);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalUsers,
      totalClinics,
      totalDiagnoses,
      totalPatients,
      thisMonthUsers,
      lastMonthUsers,
      thisMonthDiagnoses,
      lastMonthDiagnoses,
      clinicsByStatus,
      diagnosesPerMonth
    ] = await Promise.all([
      this.prisma.user.count({ where: { deleted: false } }),
      this.prisma.clinic.count(),
      this.prisma.patientDiagnosis.count(),
      this.prisma.patient.count(),
      this.prisma.user.count({
        where: {
          createdAt: { gte: startOfMonth },
          deleted: false
        }
      }),
      this.prisma.user.count({
        where: {
          createdAt: { gte: startOfLastMonth, lt: startOfMonth },
          deleted: false
        }
      }),
      this.prisma.patientDiagnosis.count({
        where: { createdAt: { gte: startOfMonth } }
      }),
      this.prisma.patientDiagnosis.count({
        where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } }
      }),
      this.prisma.clinic.groupBy({
        by: ['status'],
        _count: true
      }),
      this.prisma.patientDiagnosis.groupBy({
        by: ['createdAt'],
        _count: true,
        where: {
          createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) }
        }
      })
    ]);

    const userGrowthRate = lastMonthUsers > 0
      ? ((thisMonthUsers - lastMonthUsers) / lastMonthUsers) * 100
      : 0;

    const diagnosisGrowthRate = lastMonthDiagnoses > 0
      ? ((thisMonthDiagnoses - lastMonthDiagnoses) / lastMonthDiagnoses) * 100
      : 0;

    return {
      totalUsers,
      totalClinics,
      totalDiagnoses,
      totalPatients,
      newUsersThisMonth: thisMonthUsers,
      newDiagnosesThisMonth: thisMonthDiagnoses,
      userGrowthRate: Math.round(userGrowthRate * 100) / 100,
      diagnosisGrowthRate: Math.round(diagnosisGrowthRate * 100) / 100,
      clinicsByStatus: clinicsByStatus.reduce((acc, item) => {
        acc[item.status.toLowerCase()] = item._count;
        return acc;
      }, {}),
      diagnosesPerMonth: this.formatMonthlyData(diagnosesPerMonth)
    };
  }

  /**
   * Obter relatório de crescimento
   */
  async getGrowthReport(adminId: number, period: string = '30d') {
    await this.verifyAdminRole(adminId);

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default: // 30d
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const [userGrowth, clinicGrowth, diagnosisGrowth] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['createdAt'],
        _count: true,
        where: {
          createdAt: { gte: startDate },
          deleted: false
        }
      }),
      this.prisma.clinic.groupBy({
        by: ['createdAt'],
        _count: true,
        where: { createdAt: { gte: startDate } }
      }),
      this.prisma.patientDiagnosis.groupBy({
        by: ['createdAt'],
        _count: true,
        where: { createdAt: { gte: startDate } }
      })
    ]);

    return {
      period,
      userGrowth: this.formatDailyData(userGrowth, period),
      clinicGrowth: this.formatDailyData(clinicGrowth, period),
      diagnosisGrowth: this.formatDailyData(diagnosisGrowth, period)
    };
  }

  /**
   * Obter relatório de diagnósticos
   */
  async getDiagnosesReport(adminId: number, startDate?: string, endDate?: string) {
    await this.verifyAdminRole(adminId);

    const where: any = {};
    if (startDate) where.createdAt = { gte: new Date(startDate) };
    if (endDate) {
      where.createdAt = {
        ...where.createdAt,
        lte: new Date(endDate)
      };
    }

    const [
      diagnosesCount,
      diagnosesPerCondition,
      diagnosesPerSeverity,
      validationRate,
      averageConfidence
    ] = await Promise.all([
      this.prisma.patientDiagnosis.count({ where }),
      this.prisma.patientDiagnosis.groupBy({
        by: ['condition'],
        _count: true,
        where
      }),
      this.prisma.patientDiagnosis.groupBy({
        by: ['severity'],
        _count: true,
        where
      }),
      this.prisma.patientDiagnosis.count({
        where: { ...where, validated: true }
      }),
      this.prisma.patientDiagnosis.aggregate({
        where,
        _avg: { score: true }
      })
    ]);

    return {
      totalDiagnoses: diagnosesCount,
      diagnosesPerCondition: diagnosesPerCondition.map(item => ({
        condition: item.condition,
        count: item._count
      })),
      diagnosesPerSeverity: diagnosesPerSeverity.map(item => ({
        severity: item.severity,
        count: item._count
      })),
      validationRate: diagnosesCount > 0 ? Math.round((validationRate / diagnosesCount) * 100) : 0,
      averageConfidence: Math.round((averageConfidence._avg.score || 0) * 100) / 100
    };
  }

  /**
   * Formatar dados mensais
   */
  private formatMonthlyData(data: any[]) {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                   'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    const result = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = months[date.getMonth()];
      const count = data.filter(item => {
        const itemDate = new Date(item.createdAt);
        return itemDate.getMonth() === date.getMonth() &&
               itemDate.getFullYear() === date.getFullYear();
      }).reduce((sum, item) => sum + item._count, 0);

      result.push({ month: monthName, count });
    }

    return result;
  }

  /**
   * Formatar dados diários
   */
  private formatDailyData(data: any[], period: string) {
    // Implementação simplificada - pode ser expandida conforme necessário
    return data.map(item => ({
      date: item.createdAt,
      count: item._count
    }));
  }

  /**
   * Obter configurações do sistema
   */
  async getSystemSettings(adminId: number) {
    await this.verifyAdminRole(adminId);

    // Por enquanto, retornar configurações padrão
    // Em uma implementação real, isso viria de uma tabela de configurações
    return {
      general: {
        siteName: 'Kumona Vision Care',
        siteDescription: 'Sistema de diagnóstico oftalmológico por IA',
        contactEmail: 'contato@kumona.com',
        supportPhone: '(11) 3000-0000',
        maintenanceMode: false
      },
      security: {
        passwordMinLength: 8,
        requireTwoFactor: false,
        sessionTimeout: 30,
        maxLoginAttempts: 5,
        lockoutDuration: 15
      },
      notifications: {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        adminAlerts: true
      },
      clinic: {
        autoApproval: false,
        requireDocuments: true,
        validationRequired: true,
        maxPatientsPerClinic: 1000
      },
      ai: {
        confidenceThreshold: 0.8,
        autoValidationThreshold: 0.95,
        enableContinuousLearning: true,
        retrainInterval: 7
      },
      system: {
        backupFrequency: 'daily',
        logRetention: 90,
        apiRateLimit: 1000,
        maxFileSize: 10
      }
    };
  }

  /**
   * Atualizar configurações do sistema
   */
  async updateSystemSettings(adminId: number, settings: any) {
    await this.verifyAdminRole(adminId);

    // Por enquanto, apenas simular a atualização
    // Em uma implementação real, isso salvaria em uma tabela de configurações
    this.logger.log(`Configurações atualizadas pelo admin ${adminId}:`, settings);

    return {
      success: true,
      message: 'Configurações atualizadas com sucesso',
      updatedAt: new Date().toISOString()
    };
  }
}
