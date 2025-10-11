import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicStatusDto, ClinicStatus } from './dto/update-clinic-status.dto';
import { AdminStatsDto } from './dto/admin-stats.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private prisma: PrismaService) {}

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
    await this.verifyAdminRole(adminId);

    // Verificar se o usuário existe e não é admin
    const user = await this.prisma.user.findUnique({
      where: { id: createClinicDto.userId }
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (user.role !== UserRole.USER) {
      throw new BadRequestException('Usuário já possui um role específico');
    }

    // Verificar se CNPJ já existe
    const existingClinic = await this.prisma.clinic.findUnique({
      where: { nif: createClinicDto.nif }
    });

    if (existingClinic) {
      throw new BadRequestException('CNPJ já cadastrado');
    }

    // Verificar se email da clínica já existe
    const existingEmail = await this.prisma.clinic.findUnique({
      where: { email: createClinicDto.email }
    });

    if (existingEmail) {
      throw new BadRequestException('Email da clínica já cadastrado');
    }

    // Criar clínica e atualizar role do usuário
    const clinic = await this.prisma.$transaction(async (tx) => {
      // Atualizar role do usuário para CLINIC
      await tx.user.update({
        where: { id: createClinicDto.userId },
        data: { role: UserRole.CLINIC }
      });

      // Criar clínica
      return tx.clinic.create({
        data: {
          ...createClinicDto,
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

    return clinic;
  }

  /**
   * Listar todas as clínicas
   */
  async getAllClinics(adminId: number, status?: ClinicStatus) {
    await this.verifyAdminRole(adminId);

    const where = status ? { status } : {};

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
      where: { id: clinicId },
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
   * Atualizar status de uma clínica
   */
  async updateClinicStatus(adminId: number, clinicId: number, updateStatusDto: UpdateClinicStatusDto) {
    await this.verifyAdminRole(adminId);

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId }
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

    return updatedClinic;
  }

  /**
   * Obter estatísticas administrativas
   */
  async getAdminStats(adminId: number): Promise<AdminStatsDto> {
    await this.verifyAdminRole(adminId);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      totalClinics,
      clinicsByStatus,
      totalPatients,
      totalDiagnoses,
      validatedDiagnoses,
      specialistFeedbacks,
      newUsersThisMonth,
      newDiagnosesThisMonth
    ] = await Promise.all([
      this.prisma.user.count({ where: { deleted: false } }),
      this.prisma.clinic.count(),
      this.prisma.clinic.groupBy({
        by: ['status'],
        _count: true
      }),
      this.prisma.patient.count(),
      this.prisma.patientDiagnosis.count(),
      this.prisma.patientDiagnosis.count({ where: { validated: true } }),
      this.prisma.specialistFeedback.count(),
      this.prisma.user.count({
        where: {
          createdAt: { gte: startOfMonth },
          deleted: false
        }
      }),
      this.prisma.patientDiagnosis.count({
        where: {
          createdAt: { gte: startOfMonth }
        }
      })
    ]);

    const statusCounts = clinicsByStatus.reduce((acc, item) => {
      acc[item.status] = item._count;
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
      newDiagnosesThisMonth
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

    return this.prisma.user.update({
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
