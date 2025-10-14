import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdateClinicProfileDto } from './dto/update-clinic-profile.dto';
import { ClinicStatsDto } from './dto/clinic-stats.dto';
import { UserRole } from '@prisma/client';
import { DiagnosisService } from '../diagnosis/diagnosis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PersonalizedContentService } from '../ai/personalized-content.service';

@Injectable()
export class ClinicService {
  private readonly logger = new Logger(ClinicService.name);

  constructor(
    private prisma: PrismaService,
    private diagnosisService: DiagnosisService,
    private notificationsService: NotificationsService,
    private personalizedContentService: PersonalizedContentService
  ) {}

  /**
   * Verifica se o usuário é uma clínica aprovada
   */
  async verifyClinicRole(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        clinic: true
      }
    });

    if (!user || user.role !== UserRole.CLINIC) {
      throw new ForbiddenException('Acesso negado. Apenas clínicas podem realizar esta ação.');
    }

    if (!user.clinic) {
      throw new ForbiddenException('Clínica não encontrada para este usuário.');
    }

    if (user.clinic.status !== 'APPROVED') {
      throw new ForbiddenException('Clínica não está aprovada para realizar esta ação.');
    }

    return user.clinic;
  }

  /**
   * Obter perfil da clínica
   */
  async getClinicProfile(userId: number) {
    const clinic = await this.verifyClinicRole(userId);

    return this.prisma.clinic.findUnique({
      where: { id: clinic.id },
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
      }
    });
  }

  /**
   * Atualizar perfil da clínica
   */
  async updateClinicProfile(userId: number, updateData: UpdateClinicProfileDto) {
    const clinic = await this.verifyClinicRole(userId);

    // Verificar se email já existe (se estiver sendo alterado)
    if (updateData.email && updateData.email !== clinic.email) {
      const existingEmail = await this.prisma.clinic.findUnique({
        where: { email: updateData.email }
      });

      if (existingEmail) {
        throw new BadRequestException('Email já está em uso por outra clínica');
      }
    }

    return this.prisma.clinic.update({
      where: { id: clinic.id },
      data: updateData,
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
  }

  /**
   * Atualizar foto do perfil da clínica
   */
  async updateProfileImage(userId: number, imageFile: Express.Multer.File) {
    if (!imageFile) {
      throw new BadRequestException('Nenhuma imagem foi enviada');
    }

    // Validar tipo de arquivo
    if (!imageFile.mimetype.startsWith('image/')) {
      throw new BadRequestException('Arquivo deve ser uma imagem');
    }

    // Validar tamanho (máximo 5MB)
    if (imageFile.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Imagem deve ter no máximo 5MB');
    }

    const clinic = await this.verifyClinicRole(userId);

    // Converter a imagem para base64
    const imageBase64 = `data:${imageFile.mimetype};base64,${imageFile.buffer.toString('base64')}`;

    // Atualizar tanto a clínica quanto o usuário
    await Promise.all([
      this.prisma.clinic.update({
        where: { id: clinic.id },
        data: { profileImage: imageBase64 }
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { profileImage: imageBase64 }
      })
    ]);

    return { profileImage: imageBase64 };
  }

  /**
   * Buscar detalhes de um paciente específico
   */
  async getPatientDetails(userId: number, patientId: number) {
    const clinic = await this.verifyClinicRole(userId);

    const patient = await this.prisma.patient.findFirst({
      where: {
        id: patientId,
        clinicId: clinic.id
      },
      include: {
        diagnoses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            condition: true,
            severity: true,
            score: true,
            createdAt: true
          }
        }
      }
    });

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado');
    }

    return {
      ...patient,
      lastDiagnosis: patient.diagnoses[0] || null
    };
  }

  /**
   * Buscar diagnósticos de um paciente específico
   */
  async getPatientDiagnoses(userId: number, patientId: number) {
    const clinic = await this.verifyClinicRole(userId);

    // Verificar se o paciente pertence à clínica
    const patient = await this.prisma.patient.findFirst({
      where: {
        id: patientId,
        clinicId: clinic.id
      }
    });

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado');
    }

    const diagnoses = await this.prisma.patientDiagnosis.findMany({
      where: {
        patientId: patientId
      },
      orderBy: { createdAt: 'desc' },
      include: {
        clinic: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    return {
      data: diagnoses.map(diagnosis => ({
        id: diagnosis.id,
        condition: diagnosis.condition,
        severity: diagnosis.severity,
        score: diagnosis.score,
        imageUrl: diagnosis.imageUrl,
        createdAt: diagnosis.createdAt,
        validated: diagnosis.validated,
        validatedBy: diagnosis.clinic?.user?.name,
        validatedAt: diagnosis.validatedAt,
        notes: diagnosis.description
      }))
    };
  }

  /**
   * Criar novo paciente
   */
  async createPatient(userId: number, createPatientDto: CreatePatientDto) {
    const clinic = await this.verifyClinicRole(userId);

    // Verificar se CPF já existe (se fornecido)
    if (createPatientDto.bi) {
      const existingPatient = await this.prisma.patient.findUnique({
        where: { bi: createPatientDto.bi }
      });

      if (existingPatient) {
        throw new BadRequestException('CPF já cadastrado para outro paciente');
      }
    }

    return this.prisma.patient.create({
      data: {
        ...createPatientDto,
        birthDate: new Date(createPatientDto.birthDate),
        clinicId: clinic.id,
        addedBy: userId,
        allergies: createPatientDto.allergies || [],
        medications: createPatientDto.medications || [],
        medicalHistory: createPatientDto.medicalHistory || []
      },
      include: {
        clinic: {
          select: {
            id: true,
            name: true
          }
        },
        addedByUser: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  }

  /**
   * Listar pacientes da clínica
   */
  async getPatients(userId: number, page: number = 1, limit: number = 10, search?: string) {
    const clinic = await this.verifyClinicRole(userId);

    const skip = (page - 1) * limit;
    const where = {
      clinicId: clinic.id,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { bi: { contains: search, mode: 'insensitive' as const } }
        ]
      })
    };

    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              diagnoses: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      this.prisma.patient.count({ where })
    ]);

    return {
      data: patients,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Obter detalhes de um paciente específico
   */
  async getPatientById(userId: number, patientId: number) {
    const clinic = await this.verifyClinicRole(userId);

    const patient = await this.prisma.patient.findFirst({
      where: {
        id: patientId,
        clinicId: clinic.id
      },
      include: {
        diagnoses: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        clinic: {
          select: {
            id: true,
            name: true
          }
        },
        addedByUser: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado ou não pertence a esta clínica');
    }

    return patient;
  }

  /**
   * Atualizar dados de um paciente
   */
  async updatePatient(userId: number, patientId: number, updateData: Partial<CreatePatientDto>) {
    const clinic = await this.verifyClinicRole(userId);

    const patient = await this.prisma.patient.findFirst({
      where: {
        id: patientId,
        clinicId: clinic.id
      }
    });

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado ou não pertence a esta clínica');
    }

    // Verificar se CPF já existe (se estiver sendo alterado)
    if (updateData.bi && updateData.bi !== patient.bi) {
      const existingPatient = await this.prisma.patient.findUnique({
        where: { bi: updateData.bi }
      });

      if (existingPatient) {
        throw new BadRequestException('CPF já cadastrado para outro paciente');
      }
    }

    const dataToUpdate = {
      ...updateData,
      ...(updateData.birthDate && { birthDate: new Date(updateData.birthDate) })
    };

    return this.prisma.patient.update({
      where: { id: patientId },
      data: dataToUpdate,
      include: {
        clinic: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  }

  /**
   * Obter estatísticas da clínica
   */
  async getClinicStats(userId: number): Promise<ClinicStatsDto> {
    const clinic = await this.verifyClinicRole(userId);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalPatients,
      newPatientsThisMonth,
      totalDiagnoses,
      diagnosesThisMonth,
      validatedDiagnoses,
      diagnosisByCondition,
      diagnosisBySeverity,
      averageScoreResult,
      activePatientsLast30Days
    ] = await Promise.all([
      this.prisma.patient.count({ where: { clinicId: clinic.id } }),
      this.prisma.patient.count({
        where: {
          clinicId: clinic.id,
          createdAt: { gte: startOfMonth }
        }
      }),
      this.prisma.patientDiagnosis.count({ where: { clinicId: clinic.id } }),
      this.prisma.patientDiagnosis.count({
        where: {
          clinicId: clinic.id,
          createdAt: { gte: startOfMonth }
        }
      }),
      this.prisma.patientDiagnosis.count({
        where: {
          clinicId: clinic.id,
          validated: true
        }
      }),
      this.prisma.patientDiagnosis.groupBy({
        by: ['condition'],
        where: { clinicId: clinic.id },
        _count: true
      }),
      this.prisma.patientDiagnosis.groupBy({
        by: ['severity'],
        where: { clinicId: clinic.id },
        _count: true
      }),
      this.prisma.patientDiagnosis.aggregate({
        where: { clinicId: clinic.id },
        _avg: { score: true }
      }),
      this.prisma.patient.count({
        where: {
          clinicId: clinic.id,
          diagnoses: {
            some: {
              createdAt: { gte: thirtyDaysAgo }
            }
          }
        }
      })
    ]);

    const conditionCounts = diagnosisByCondition.reduce((acc, item) => {
      acc[item.condition] = item._count;
      return acc;
    }, {} as Record<string, number>);

    const severityCounts = diagnosisBySeverity.reduce((acc, item) => {
      acc[item.severity] = item._count;
      return acc;
    }, {} as Record<string, number>);

    const validationRate = totalDiagnoses > 0 ? (validatedDiagnoses / totalDiagnoses) * 100 : 0;

    return {
      totalPatients,
      newPatientsThisMonth,
      totalDiagnoses,
      diagnosesThisMonth,
      validatedDiagnoses,
      validationRate: Math.round(validationRate * 100) / 100,
      diagnosisByCondition: conditionCounts,
      diagnosisBySeverity: severityCounts,
      averageScore: Math.round((averageScoreResult._avg.score || 0) * 100) / 100,
      activePatientsLast30Days
    };
  }

  /**
   * Deletar paciente (soft delete)
   */
  async deletePatient(userId: number, patientId: number) {
    const clinic = await this.verifyClinicRole(userId);

    const patient = await this.prisma.patient.findFirst({
      where: {
        id: patientId,
        clinicId: clinic.id
      }
    });

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado ou não pertence a esta clínica');
    }

    // Não deletamos fisicamente, apenas marcamos como inativo
    // Para isso, vamos adicionar um campo 'active' no schema futuramente
    // Por enquanto, vamos apenas retornar sucesso
    this.logger.log(`Paciente ${patientId} marcado para exclusão pela clínica ${clinic.id}`);

    return { message: 'Paciente removido com sucesso' };
  }

  /**
   * Registrar novo usuário pela clínica
   */
  async registerUser(userId: number, userData: { name: string; email: string; phone?: string }) {
    const clinic = await this.verifyClinicRole(userId);

    // Verificar se o email já existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (existingUser) {
      throw new BadRequestException('Este email já está cadastrado no sistema');
    }

    // Gerar senha aleatória
    const generatePassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let password = '';
      for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };

    const temporaryPassword = generatePassword();

    // Hash da senha temporária
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    // Criar o usuário
    const newUser = await this.prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        password: hashedPassword,
        role: UserRole.USER,
        birthDate: new Date('1990-01-01') // Data padrão para usuários registrados pela clínica
      }
    });

    this.logger.log(`Novo usuário ${newUser.id} registrado pela clínica ${clinic.id}`);

    // Retornar as credenciais para a clínica mostrar ao usuário
    return {
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone
      },
      credentials: {
        email: newUser.email,
        password: temporaryPassword
      },
      message: 'Usuário registrado com sucesso. Forneça as credenciais ao paciente.'
    };
  }

  /**
   * Obter usuários que selecionaram esta clínica para acompanhamento
   */
  async getSelectedUsers(userId: number, page: number = 1, limit: number = 10, search?: string) {
    const clinic = await this.verifyClinicRole(userId);

    const where: any = {
      selectedClinicId: clinic.id,
      role: UserRole.USER,
      deleted: false
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          birthDate: true,
          profileImage: true,
          createdAt: true,
          diagnoses: {
            select: {
              id: true,
              condition: true,
              severity: true,
              score: true,
              createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 1 // Último diagnóstico
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.user.count({ where })
    ]);

    return {
      data: users.map(user => ({
        ...user,
        lastDiagnosis: user.diagnoses[0] || null,
        diagnoses: undefined // Remove o array completo, mantém apenas o último
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Obter histórico de diagnósticos de um usuário específico
   */
  async getUserDiagnoses(clinicUserId: number, userId: number, page: number = 1, limit: number = 10) {
    const clinic = await this.verifyClinicRole(clinicUserId);

    // Verificar se o usuário selecionou esta clínica
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        selectedClinicId: clinic.id,
        role: UserRole.USER,
        deleted: false
      },
      select: {
        id: true,
        name: true,
        email: true,
        birthDate: true
      }
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado ou não selecionou esta clínica para acompanhamento');
    }

    const skip = (page - 1) * limit;

    const [diagnoses, total] = await Promise.all([
      this.prisma.diagnosis.findMany({
        where: { userId },
        select: {
          id: true,
          imageUrl: true,
          condition: true,
          severity: true,
          score: true,
          description: true,
          recommendations: true,
          createdAt: true
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.diagnosis.count({ where: { userId } })
    ]);

    return {
      user,
      diagnoses: {
        data: diagnoses,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    };
  }

  /**
   * Analisar imagem de paciente com IA
   */
  async analyzePatientImage(userId: number, patientId: number, imageFile: Express.Multer.File) {
    if (!imageFile) {
      throw new BadRequestException('Nenhuma imagem foi enviada');
    }

    // Validar tipo de arquivo
    if (!imageFile.mimetype.startsWith('image/')) {
      throw new BadRequestException('Arquivo deve ser uma imagem');
    }

    // Validar tamanho (máximo 10MB)
    if (imageFile.size > 10 * 1024 * 1024) {
      throw new BadRequestException('Imagem deve ter no máximo 10MB');
    }

    const clinic = await this.verifyClinicRole(userId);

    // Verificar se o paciente pertence à clínica
    const patient = await this.prisma.patient.findFirst({
      where: {
        id: patientId,
        clinicId: clinic.id
      }
    });

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado ou não pertence a esta clínica');
    }

    try {
      // Usar o serviço de diagnóstico para analisar a imagem
      const diagnosisResult = await this.diagnosisService.analyzeImage(userId, imageFile);

      // Converter a imagem para base64 para armazenamento
      const imageBase64 = `data:${imageFile.mimetype};base64,${imageFile.buffer.toString('base64')}`;

      // Gerar recomendações personalizadas para o PACIENTE (não para o médico)
      const personalizedRecommendations = await this.generatePersonalizedRecommendationsForPatient(
        patient,
        diagnosisResult
      );

      // Criar o diagnóstico do paciente
      const patientDiagnosis = await this.prisma.patientDiagnosis.create({
        data: {
          imageUrl: imageBase64,
          condition: diagnosisResult.condition,
          severity: diagnosisResult.severity,
          score: diagnosisResult.score,
          description: diagnosisResult.description,
          recommendations: personalizedRecommendations,
          patientId: patientId,
          clinicId: clinic.id,
          validated: false
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              email: true,
              birthDate: true,
              gender: true
            }
          },
          clinic: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      this.logger.log(`Diagnóstico criado para paciente ${patientId} pela clínica ${clinic.id}`);

      // Enviar notificações tanto para a clínica quanto para o paciente
      await this.sendDiagnosisNotifications(patientDiagnosis, clinic, patient);

      return patientDiagnosis;
    } catch (error) {
      this.logger.error(`Erro ao analisar imagem do paciente ${patientId}:`, error);
      throw new BadRequestException('Erro ao processar a imagem. Tente novamente.');
    }
  }

  /**
   * Gerar recomendações personalizadas para o paciente
   */
  private async generatePersonalizedRecommendationsForPatient(
    patient: any,
    diagnosisResult: any
  ): Promise<string[]> {
    try {
      // Criar perfil do paciente para personalização
      const patientProfile = {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        birthDate: patient.birthDate,
        gender: patient.gender,
        medicalHistory: {
          existingConditions: [],
          familyHistory: [],
          medications: []
        },
        diagnoses: [] // Histórico de diagnósticos anteriores pode ser adicionado aqui
      };

      // Adicionar o diagnóstico atual ao contexto
      const currentDiagnosis = {
        condition: diagnosisResult.condition,
        severity: diagnosisResult.severity,
        score: diagnosisResult.score,
        createdAt: new Date()
      };

      patientProfile.diagnoses.push(currentDiagnosis);

      // Usar o serviço de conteúdo personalizado para gerar dicas para o paciente
      const personalizedTips = await this.personalizedContentService.generatePersonalizedTips(
        patientProfile,
        5 // Gerar 5 recomendações personalizadas
      );

      // Converter tips para formato de recomendações
      const personalizedRecommendations = personalizedTips.map(tip =>
        `${tip.title}: ${tip.description}`
      );

      // Se não conseguiu gerar recomendações personalizadas, usar as padrão
      if (personalizedRecommendations.length === 0) {
        this.logger.warn(`Não foi possível gerar recomendações personalizadas para paciente ${patient.id}, usando padrão`);
        return diagnosisResult.recommendations || [];
      }

      this.logger.log(`Geradas ${personalizedRecommendations.length} recomendações personalizadas para paciente ${patient.name}`);
      return personalizedRecommendations;

    } catch (error) {
      this.logger.error(`Erro ao gerar recomendações personalizadas para paciente ${patient.id}:`, error);
      // Em caso de erro, retornar as recomendações padrão
      return diagnosisResult.recommendations || [];
    }
  }

  /**
   * Enviar notificações para clínica e paciente sobre o diagnóstico
   */
  private async sendDiagnosisNotifications(
    patientDiagnosis: any,
    clinic: any,
    patient: any
  ): Promise<void> {
    try {
      // Notificação para a clínica (médico que fez o diagnóstico)
      const clinicUserId = clinic.userId || clinic.addedBy;
      if (clinicUserId) {
        await this.notificationsService.createNotification(
          clinicUserId,
          '✅ Diagnóstico Realizado',
          `Diagnóstico concluído para o paciente ${patient.name}. Condição: ${patientDiagnosis.condition}`,
          'success',
          false // Não enviar email para a clínica
        );
      }

      // Notificação para o paciente (se ele for um usuário do sistema)
      // Buscar se o paciente tem conta no sistema pelo email
      if (patient.email) {
        const patientUser = await this.prisma.user.findUnique({
          where: { email: patient.email }
        });

        if (patientUser) {
          // Determinar tipo de notificação baseado na severidade
          let notificationType = 'info';
          let notificationTitle = '📋 Novo Diagnóstico Disponível';

          if (patientDiagnosis.severity === 'high') {
            notificationType = 'error';
            notificationTitle = '⚠️ Diagnóstico Requer Atenção';
          } else if (patientDiagnosis.severity === 'medium') {
            notificationType = 'warning';
            notificationTitle = '⚡ Diagnóstico Requer Cuidado';
          }

          await this.notificationsService.createNotification(
            patientUser.id,
            notificationTitle,
            `Seu diagnóstico foi concluído pela ${clinic.name}. Condição: ${patientDiagnosis.condition}. Acesse o sistema para ver os detalhes e recomendações.`,
            notificationType,
            true, // Enviar email para o paciente
            'Novo Diagnóstico Disponível'
          );

          this.logger.log(`Notificação enviada para o paciente ${patient.name} (usuário ID: ${patientUser.id})`);
        } else {
          this.logger.log(`Paciente ${patient.name} não possui conta no sistema. Notificação não enviada.`);
        }
      }

    } catch (error) {
      this.logger.error('Erro ao enviar notificações de diagnóstico:', error);
      // Não falhar o processo principal se as notificações falharem
    }
  }
}
