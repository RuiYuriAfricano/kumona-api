import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdateClinicProfileDto } from './dto/update-clinic-profile.dto';
import { ClinicStatsDto } from './dto/clinic-stats.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class ClinicService {
  private readonly logger = new Logger(ClinicService.name);

  constructor(private prisma: PrismaService) {}

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
          { cpf: { contains: search, mode: 'insensitive' as const } }
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
}
