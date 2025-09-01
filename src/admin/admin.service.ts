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
      where: { cnpj: createClinicDto.cnpj }
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
}
