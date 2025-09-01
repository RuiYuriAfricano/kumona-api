import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpecialistFeedbackDto, ValidateDiagnosisDto } from './dto/specialist-feedback.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class SpecialistFeedbackService {
  private readonly logger = new Logger(SpecialistFeedbackService.name);

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
   * Validar diagnóstico por especialista
   */
  async validateDiagnosis(userId: number, diagnosisId: number, validateDto: ValidateDiagnosisDto) {
    const clinic = await this.verifyClinicRole(userId);

    // Verificar se o diagnóstico pertence à clínica
    const diagnosis = await this.prisma.patientDiagnosis.findFirst({
      where: {
        id: diagnosisId,
        clinicId: clinic.id
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!diagnosis) {
      throw new NotFoundException('Diagnóstico não encontrado ou não pertence a esta clínica');
    }

    // Atualizar diagnóstico com validação
    const updatedDiagnosis = await this.prisma.patientDiagnosis.update({
      where: { id: diagnosisId },
      data: {
        validated: validateDto.validated,
        validatedBy: userId,
        validatedAt: new Date(),
        specialistNotes: validateDto.specialistNotes,
        correctedCondition: validateDto.correctedCondition,
        correctedSeverity: validateDto.correctedSeverity
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true
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

    this.logger.log(`Diagnóstico ${diagnosisId} validado por especialista da clínica ${clinic.name}`);

    return updatedDiagnosis;
  }

  /**
   * Criar feedback detalhado de especialista
   */
  async createSpecialistFeedback(userId: number, diagnosisId: number, feedbackDto: CreateSpecialistFeedbackDto) {
    const clinic = await this.verifyClinicRole(userId);

    // Verificar se o diagnóstico pertence à clínica
    const diagnosis = await this.prisma.patientDiagnosis.findFirst({
      where: {
        id: diagnosisId,
        clinicId: clinic.id
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true
          }
        },
        feedback: true
      }
    });

    if (!diagnosis) {
      throw new NotFoundException('Diagnóstico não encontrado ou não pertence a esta clínica');
    }

    if (diagnosis.feedback) {
      throw new BadRequestException('Feedback já existe para este diagnóstico');
    }

    // Criar feedback
    const feedback = await this.prisma.specialistFeedback.create({
      data: {
        diagnosisId,
        ...feedbackDto,
        processed: false
      },
      include: {
        diagnosis: {
          include: {
            patient: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    // Atualizar diagnóstico como validado se o feedback indica correção
    if (!feedbackDto.isCorrect || feedbackDto.correctCondition || feedbackDto.correctSeverity) {
      await this.prisma.patientDiagnosis.update({
        where: { id: diagnosisId },
        data: {
          validated: true,
          validatedBy: userId,
          validatedAt: new Date(),
          specialistNotes: feedbackDto.notes,
          correctedCondition: feedbackDto.correctCondition,
          correctedSeverity: feedbackDto.correctSeverity
        }
      });
    }

    this.logger.log(`Feedback criado para diagnóstico ${diagnosisId} por ${feedbackDto.specialistName} (CRM: ${feedbackDto.specialistCrm})`);

    return feedback;
  }

  /**
   * Listar diagnósticos pendentes de validação
   */
  async getPendingValidations(userId: number, page: number = 1, limit: number = 10) {
    const clinic = await this.verifyClinicRole(userId);

    const skip = (page - 1) * limit;

    const [diagnoses, total] = await Promise.all([
      this.prisma.patientDiagnosis.findMany({
        where: {
          clinicId: clinic.id,
          validated: false
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              email: true,
              birthDate: true
            }
          },
          feedback: true
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      }),
      this.prisma.patientDiagnosis.count({
        where: {
          clinicId: clinic.id,
          validated: false
        }
      })
    ]);

    return {
      data: diagnoses,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Listar todos os feedbacks da clínica
   */
  async getClinicFeedbacks(userId: number, page: number = 1, limit: number = 10) {
    const clinic = await this.verifyClinicRole(userId);

    const skip = (page - 1) * limit;

    const [feedbacks, total] = await Promise.all([
      this.prisma.specialistFeedback.findMany({
        where: {
          diagnosis: {
            clinicId: clinic.id
          }
        },
        include: {
          diagnosis: {
            include: {
              patient: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      }),
      this.prisma.specialistFeedback.count({
        where: {
          diagnosis: {
            clinicId: clinic.id
          }
        }
      })
    ]);

    return {
      data: feedbacks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Obter estatísticas de feedback da clínica
   */
  async getFeedbackStats(userId: number) {
    const clinic = await this.verifyClinicRole(userId);

    const [
      totalDiagnoses,
      validatedDiagnoses,
      totalFeedbacks,
      correctDiagnoses,
      incorrectDiagnoses,
      averageConfidence
    ] = await Promise.all([
      this.prisma.patientDiagnosis.count({
        where: { clinicId: clinic.id }
      }),
      this.prisma.patientDiagnosis.count({
        where: {
          clinicId: clinic.id,
          validated: true
        }
      }),
      this.prisma.specialistFeedback.count({
        where: {
          diagnosis: {
            clinicId: clinic.id
          }
        }
      }),
      this.prisma.specialistFeedback.count({
        where: {
          diagnosis: {
            clinicId: clinic.id
          },
          isCorrect: true
        }
      }),
      this.prisma.specialistFeedback.count({
        where: {
          diagnosis: {
            clinicId: clinic.id
          },
          isCorrect: false
        }
      }),
      this.prisma.specialistFeedback.aggregate({
        where: {
          diagnosis: {
            clinicId: clinic.id
          }
        },
        _avg: {
          confidence: true
        }
      })
    ]);

    const validationRate = totalDiagnoses > 0 ? (validatedDiagnoses / totalDiagnoses) * 100 : 0;
    const accuracyRate = totalFeedbacks > 0 ? (correctDiagnoses / totalFeedbacks) * 100 : 0;

    return {
      totalDiagnoses,
      validatedDiagnoses,
      pendingValidations: totalDiagnoses - validatedDiagnoses,
      validationRate: Math.round(validationRate * 100) / 100,
      totalFeedbacks,
      correctDiagnoses,
      incorrectDiagnoses,
      accuracyRate: Math.round(accuracyRate * 100) / 100,
      averageConfidence: Math.round((averageConfidence._avg.confidence || 0) * 100) / 100
    };
  }
}
