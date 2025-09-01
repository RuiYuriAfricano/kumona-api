import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDiagnosisDto } from './dto/create-patient-diagnosis.dto';
import { UserRole } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class PatientDiagnosisService {
  private readonly logger = new Logger(PatientDiagnosisService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService
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
   * Analisar imagem de paciente usando a API de classificação
   */
  async analyzePatientImage(userId: number, patientId: number, imageFile: Express.Multer.File) {
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
      // Chamar a API de classificação
      const classifierUrl = this.configService.get<string>('AI_CLASSIFIER_URL', 'http://localhost:8000');
      
      const formData = new FormData();
      const blob = new Blob([imageFile.buffer], { type: imageFile.mimetype });
      formData.append('file', blob, imageFile.originalname);

      this.logger.log(`Enviando imagem para análise: ${classifierUrl}/predict`);

      const response = await axios.post(`${classifierUrl}/predict`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000
      });

      const analysisResult = response.data;

      if (!analysisResult.predicted_class) {
        throw new BadRequestException('Erro na análise da imagem');
      }

      // Mapear resultado da API para formato do banco
      const severity = this.mapConfidenceToSeverity(analysisResult.confidence);
      const score = Math.round(analysisResult.confidence * 100);

      // Salvar diagnóstico no banco
      const diagnosis = await this.prisma.patientDiagnosis.create({
        data: {
          imageUrl: `temp_${Date.now()}_${imageFile.originalname}`, // TODO: Implementar upload real
          condition: analysisResult.predicted_class,
          severity,
          score,
          description: this.generateDescription(analysisResult),
          recommendations: this.generateRecommendations(analysisResult.predicted_class, severity),
          patientId,
          clinicId: clinic.id,
          validated: false
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

      this.logger.log(`Diagnóstico criado com sucesso: ID ${diagnosis.id} para paciente ${patient.name}`);

      return {
        ...diagnosis,
        analysisDetails: analysisResult
      };

    } catch (error) {
      this.logger.error(`Erro na análise da imagem: ${error.message}`);
      
      if (error.response?.status === 500) {
        throw new BadRequestException('Erro interno na análise da imagem. Tente novamente.');
      }
      
      throw new BadRequestException(`Erro na análise: ${error.message}`);
    }
  }

  /**
   * Criar diagnóstico manual (sem IA)
   */
  async createManualDiagnosis(userId: number, createDiagnosisDto: CreatePatientDiagnosisDto) {
    const clinic = await this.verifyClinicRole(userId);

    // Verificar se o paciente pertence à clínica
    const patient = await this.prisma.patient.findFirst({
      where: {
        id: createDiagnosisDto.patientId,
        clinicId: clinic.id
      }
    });

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado ou não pertence a esta clínica');
    }

    const diagnosis = await this.prisma.patientDiagnosis.create({
      data: {
        ...createDiagnosisDto,
        clinicId: clinic.id,
        validated: true, // Diagnóstico manual já é considerado validado
        validatedBy: userId,
        validatedAt: new Date(),
        specialistNotes: 'Diagnóstico manual realizado pela clínica'
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

    this.logger.log(`Diagnóstico manual criado: ID ${diagnosis.id} para paciente ${patient.name}`);

    return diagnosis;
  }

  /**
   * Listar diagnósticos de um paciente
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
      throw new NotFoundException('Paciente não encontrado ou não pertence a esta clínica');
    }

    return this.prisma.patientDiagnosis.findMany({
      where: {
        patientId,
        clinicId: clinic.id
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        feedback: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * Obter detalhes de um diagnóstico específico
   */
  async getDiagnosisById(userId: number, diagnosisId: number) {
    const clinic = await this.verifyClinicRole(userId);

    const diagnosis = await this.prisma.patientDiagnosis.findFirst({
      where: {
        id: diagnosisId,
        clinicId: clinic.id
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
        },
        feedback: true
      }
    });

    if (!diagnosis) {
      throw new NotFoundException('Diagnóstico não encontrado ou não pertence a esta clínica');
    }

    return diagnosis;
  }

  /**
   * Mapear confiança para severidade
   */
  private mapConfidenceToSeverity(confidence: number): string {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  }

  /**
   * Gerar descrição baseada no resultado
   */
  private generateDescription(analysisResult: any): string {
    const condition = analysisResult.predicted_class;
    const confidence = Math.round(analysisResult.confidence * 100);

    const descriptions = {
      normal: `Análise indica olho saudável com ${confidence}% de confiança. Não foram detectadas anomalias significativas.`,
      cataract: `Possível presença de catarata detectada com ${confidence}% de confiança. Recomenda-se avaliação oftalmológica.`,
      diabetic_retinopathy: `Sinais de retinopatia diabética identificados com ${confidence}% de confiança. Necessária avaliação especializada urgente.`,
      glaucoma: `Indicadores de glaucoma detectados com ${confidence}% de confiança. Recomenda-se exame de pressão intraocular.`
    };

    return descriptions[condition] || `Condição ${condition} detectada com ${confidence}% de confiança.`;
  }

  /**
   * Gerar recomendações baseadas na condição
   */
  private generateRecommendations(condition: string, severity: string): string[] {
    const baseRecommendations = {
      normal: [
        'Manter consultas oftalmológicas regulares',
        'Proteger os olhos da exposição solar excessiva',
        'Manter uma dieta rica em vitaminas A, C e E'
      ],
      cataract: [
        'Consultar oftalmologista para avaliação detalhada',
        'Considerar cirurgia se a visão estiver comprometida',
        'Usar óculos de sol com proteção UV',
        'Evitar dirigir à noite se a visão estiver prejudicada'
      ],
      diabetic_retinopathy: [
        'Consulta urgente com oftalmologista especializado',
        'Controle rigoroso da glicemia',
        'Monitoramento regular da pressão arterial',
        'Exames de fundo de olho periódicos'
      ],
      glaucoma: [
        'Avaliação oftalmológica especializada urgente',
        'Medição da pressão intraocular',
        'Exame de campo visual',
        'Possível necessidade de colírios hipotensores'
      ]
    };

    const recommendations = baseRecommendations[condition] || ['Consultar oftalmologista para avaliação'];

    if (severity === 'high') {
      recommendations.unshift('ATENÇÃO: Buscar atendimento médico imediatamente');
    }

    return recommendations;
  }
}
