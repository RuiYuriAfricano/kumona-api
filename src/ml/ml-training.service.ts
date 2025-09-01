import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';

interface TrainingData {
  imageUrl: string;
  correctLabel: string;
  originalPrediction: string;
  confidence: number;
  specialistConfidence: number;
  feedbackId: number;
}

@Injectable()
export class MLTrainingService {
  private readonly logger = new Logger(MLTrainingService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService
  ) {}

  /**
   * Coletar dados de feedback não processados para treinamento
   */
  async collectTrainingData(): Promise<TrainingData[]> {
    this.logger.log('Coletando dados de feedback para treinamento...');

    const feedbacks = await this.prisma.specialistFeedback.findMany({
      where: {
        processed: false,
        isCorrect: false // Apenas feedbacks que indicam erro da IA
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
      },
      take: 100 // Processar em lotes de 100
    });

    const trainingData: TrainingData[] = feedbacks
      .filter(feedback => feedback.correctCondition) // Apenas com correção definida
      .map(feedback => ({
        imageUrl: feedback.diagnosis.imageUrl,
        correctLabel: feedback.correctCondition!,
        originalPrediction: feedback.diagnosis.condition,
        confidence: feedback.diagnosis.score / 100,
        specialistConfidence: feedback.confidence / 10,
        feedbackId: feedback.id
      }));

    this.logger.log(`Coletados ${trainingData.length} exemplos para treinamento`);
    return trainingData;
  }

  /**
   * Enviar dados para a API de classificação para retreinamento
   */
  async sendTrainingData(trainingData: TrainingData[]): Promise<boolean> {
    if (trainingData.length === 0) {
      this.logger.log('Nenhum dado de treinamento disponível');
      return false;
    }

    try {
      const classifierUrl = this.configService.get<string>('AI_CLASSIFIER_URL', 'http://localhost:8000');
      
      this.logger.log(`Enviando ${trainingData.length} exemplos para retreinamento...`);

      const response = await axios.post(`${classifierUrl}/retrain`, {
        training_data: trainingData.map(data => ({
          image_url: data.imageUrl,
          correct_label: data.correctLabel,
          original_prediction: data.originalPrediction,
          confidence: data.confidence,
          specialist_confidence: data.specialistConfidence
        })),
        retrain_mode: 'incremental' // Treinamento incremental
      }, {
        timeout: 300000, // 5 minutos timeout para treinamento
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        this.logger.log('Retreinamento concluído com sucesso');
        
        // Marcar feedbacks como processados
        await this.markFeedbacksAsProcessed(trainingData.map(d => d.feedbackId));
        
        return true;
      } else {
        this.logger.error(`Erro no retreinamento: Status ${response.status}`);
        return false;
      }

    } catch (error) {
      this.logger.error(`Erro ao enviar dados para retreinamento: ${error.message}`);
      return false;
    }
  }

  /**
   * Marcar feedbacks como processados
   */
  async markFeedbacksAsProcessed(feedbackIds: number[]): Promise<void> {
    await this.prisma.specialistFeedback.updateMany({
      where: {
        id: { in: feedbackIds }
      },
      data: {
        processed: true,
        processedAt: new Date()
      }
    });

    this.logger.log(`Marcados ${feedbackIds.length} feedbacks como processados`);
  }

  /**
   * Executar processo completo de retreinamento
   */
  async performRetraining(): Promise<{ success: boolean; processedCount: number }> {
    try {
      this.logger.log('Iniciando processo de retreinamento...');

      // 1. Coletar dados
      const trainingData = await this.collectTrainingData();

      if (trainingData.length === 0) {
        return { success: true, processedCount: 0 };
      }

      // 2. Enviar para retreinamento
      const success = await this.sendTrainingData(trainingData);

      if (success) {
        // 3. Registrar estatísticas
        await this.recordTrainingStats(trainingData.length);
      }

      return { success, processedCount: trainingData.length };

    } catch (error) {
      this.logger.error(`Erro no processo de retreinamento: ${error.message}`);
      return { success: false, processedCount: 0 };
    }
  }

  /**
   * Registrar estatísticas de treinamento
   */
  async recordTrainingStats(processedCount: number): Promise<void> {
    // Aqui podemos criar uma tabela de estatísticas de treinamento
    // Por enquanto, apenas log
    this.logger.log(`Estatísticas de treinamento: ${processedCount} exemplos processados em ${new Date().toISOString()}`);
  }

  /**
   * Cron job para retreinamento automático (executa diariamente às 2h)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async automaticRetraining(): Promise<void> {
    this.logger.log('Iniciando retreinamento automático agendado...');

    const result = await this.performRetraining();

    if (result.success) {
      this.logger.log(`Retreinamento automático concluído: ${result.processedCount} exemplos processados`);
    } else {
      this.logger.error('Falha no retreinamento automático');
    }
  }

  /**
   * Obter estatísticas de aprendizado
   */
  async getMLStats() {
    const [
      totalFeedbacks,
      processedFeedbacks,
      incorrectPredictions,
      feedbacksByCondition,
      recentFeedbacks
    ] = await Promise.all([
      this.prisma.specialistFeedback.count(),
      this.prisma.specialistFeedback.count({ where: { processed: true } }),
      this.prisma.specialistFeedback.count({ where: { isCorrect: false } }),
      this.prisma.specialistFeedback.groupBy({
        by: ['correctCondition'],
        where: { correctCondition: { not: null } },
        _count: true
      }),
      this.prisma.specialistFeedback.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Últimos 7 dias
          }
        }
      })
    ]);

    const processingRate = totalFeedbacks > 0 ? (processedFeedbacks / totalFeedbacks) * 100 : 0;
    const errorRate = totalFeedbacks > 0 ? (incorrectPredictions / totalFeedbacks) * 100 : 0;

    const correctionsByCondition = feedbacksByCondition.reduce((acc, item) => {
      if (item.correctCondition) {
        acc[item.correctCondition] = item._count;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      totalFeedbacks,
      processedFeedbacks,
      pendingProcessing: totalFeedbacks - processedFeedbacks,
      processingRate: Math.round(processingRate * 100) / 100,
      incorrectPredictions,
      errorRate: Math.round(errorRate * 100) / 100,
      correctionsByCondition,
      recentFeedbacks,
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * Forçar retreinamento manual (para admins)
   */
  async forceRetraining(): Promise<{ success: boolean; message: string; processedCount: number }> {
    this.logger.log('Retreinamento manual solicitado...');

    const result = await this.performRetraining();

    return {
      success: result.success,
      message: result.success 
        ? `Retreinamento concluído com sucesso. ${result.processedCount} exemplos processados.`
        : 'Falha no retreinamento. Verifique os logs para mais detalhes.',
      processedCount: result.processedCount
    };
  }
}
