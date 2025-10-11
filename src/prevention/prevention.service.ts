import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PersonalizedContentService } from '../ai/personalized-content.service';
import { GamificationService } from '../gamification/gamification.service';
import { NotificationService } from '../notifications/notification.service';
import { CreatePreventionActivityDto } from './dto/create-prevention-activity.dto';
import { PreventionActivityDto } from './dto/prevention-activity.dto';
import { PreventionTipDto } from './dto/prevention-tip.dto';
import { EyeExerciseDto } from './dto/eye-exercise.dto';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';

@Injectable()
export class PreventionService {
  private readonly logger = new Logger(PreventionService.name);

  constructor(
    private prisma: PrismaService,
    private personalizedContentService: PersonalizedContentService,
    private gamificationService: GamificationService,
    private notificationService: NotificationService,
  ) {}

  async getPreventionTips(userId: number, category?: string, limit = 10): Promise<PreventionTipDto[]> {
    // Para novos usuários, sempre retornar array vazio
    // Só mostrar dicas após o usuário fazer pelo menos um diagnóstico
    const userDiagnoses = await this.prisma.diagnosis.count({
      where: { userId }
    });

    if (userDiagnoses === 0) {
      return [];
    }

    const where = category ? { category } : {};

    return this.prisma.preventionTip.findMany({
      where,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }



  async getPreventionTipById(id: number): Promise<PreventionTipDto> {
    const tip = await this.prisma.preventionTip.findUnique({
      where: { id },
    });

    if (!tip) {
      throw new Error('Dica de prevenção não encontrada');
    }

    return tip;
  }



  async debugUserStatus(userId: number) {
    const userDiagnoses = await this.prisma.diagnosis.count({
      where: { userId }
    });

    const userActivities = await this.prisma.preventionActivity.count({
      where: { userId }
    });

    const totalTips = await this.prisma.preventionTip.count();


    return {
      userId,
      diagnosesCount: userDiagnoses,
      activitiesCount: userActivities,
      totalTipsInDatabase: totalTips,
      shouldShowTips: userDiagnoses > 0
    };
  }

  async getUserPreventionTips(userId: number): Promise<PreventionTipDto[]> {
    // Verificar se o usuário tem diagnósticos
    const userDiagnoses = await this.prisma.diagnosis.count({
      where: { userId }
    });

    console.log(`[getUserPreventionTips] UserId: ${userId}, Diagnoses: ${userDiagnoses}`);

    if (userDiagnoses === 0) {
      console.log(`[getUserPreventionTips] Usuário ${userId} não tem diagnósticos - retornando array vazio`);
      return [];
    }

    // Verificar se há dicas personalizadas ativas para hoje
    const personalizedTips = await this.personalizedContentService.getDailyTips(userId);

    if (personalizedTips.length === 0) {
      // Gerar dicas personalizadas se não existirem
      console.log(`[getUserPreventionTips] Gerando dicas personalizadas para usuário ${userId}`);
      await this.personalizedContentService.generateDailyTips(userId);

      // Buscar as dicas recém-geradas
      const newTips = await this.personalizedContentService.getDailyTips(userId);
      console.log(`[getUserPreventionTips] ${newTips.length} dicas personalizadas geradas para usuário ${userId}`);
      return newTips;
    }

    console.log(`[getUserPreventionTips] Retornando ${personalizedTips.length} dicas personalizadas para usuário ${userId}`);
    return personalizedTips;
  }



  async getUserSavedTips(userId: number) {
    console.log(`[getUserSavedTips] Buscando dicas salvas para usuário ${userId}`);

    // Usar o novo sistema de dicas salvas
    return this.personalizedContentService.getSavedTips(userId);
  }

  async saveTip(userId: number, tipId: number, tipType: 'general' | 'personal') {
    console.log(`[saveTip] Salvando dica ${tipId} (${tipType}) para usuário ${userId}`);
    return this.personalizedContentService.saveTip(userId, tipId, tipType);
  }

  async unsaveTip(userId: number, tipId: number, tipType: 'general' | 'personal') {
    console.log(`[unsaveTip] Removendo dica ${tipId} (${tipType}) dos salvos do usuário ${userId}`);
    return this.personalizedContentService.unsaveTip(userId, tipId, tipType);
  }



  async trackPreventionActivity(userId: number, activityDto: CreatePreventionActivityDto): Promise<any> {
    this.logger.log(`🎯 [Prevention] Rastreando atividade para usuário ${userId}: ${activityDto.type}`);

    // Verificar se o usuário existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deleted: false },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Validar o tipo de atividade
    if (!['exercise', 'rest', 'medication'].includes(activityDto.type)) {
      throw new BadRequestException('Tipo de atividade inválido');
    }

    try {
      // Criar a atividade de prevenção
      const activity = await this.prisma.preventionActivity.create({
        data: {
          type: activityDto.type,
          description: activityDto.description,
          duration: activityDto.duration,
          notes: activityDto.notes,
          userId,
        },
      });

      // Mapear tipo de atividade para gamificação
      let gamificationActivityType = activityDto.type;
      let activityName = '';

      // Usar o tipo original se disponível (mais preciso que parsing da descrição)
      if (activityDto.originalActivityType) {
        gamificationActivityType = activityDto.originalActivityType;
        this.logger.log(`🎯 [Prevention] Usando tipo original: ${activityDto.originalActivityType}`);
      }

      // Extrair nome do exercício da descrição se possível
      if (activityDto.description.includes('Exercício iniciado:')) {
        if (!activityDto.originalActivityType) gamificationActivityType = 'start_exercise';
        activityName = activityDto.description.replace('Exercício iniciado: ', '');
      } else if (activityDto.description.includes('Exercício completado:')) {
        if (!activityDto.originalActivityType) gamificationActivityType = 'complete_exercise';
        activityName = activityDto.description.replace('Exercício completado: ', '');
      } else if (activityDto.description.includes('Lembrete configurado')) {
        if (!activityDto.originalActivityType) gamificationActivityType = 'set_reminder';
      }

      // Registrar atividade na gamificação
      const gamificationResult = await this.gamificationService.recordActivity(userId, {
        activityType: gamificationActivityType,
        activityName: activityName || activityDto.description,
        duration: activityDto.duration,
        metadata: {
          preventionActivityId: activity.id,
          originalType: activityDto.type,
          notes: activityDto.notes
        }
      });

      this.logger.log(`✅ [Prevention] Atividade registrada com ${gamificationResult.totalPoints} pontos`);

      // Retornar atividade com dados de gamificação
      return {
        ...activity,
        gamification: gamificationResult
      };

    } catch (error) {
      this.logger.error(`❌ [Prevention] Erro ao rastrear atividade:`, error);
      throw error;
    }
  }

  async getPreventionActivities(
    userId: number,
    page = 1,
    limit = 10,
    startDate?: string,
    endDate?: string,
  ): Promise<PaginatedResponseDto<PreventionActivityDto>> {
    // Verificar se o usuário existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deleted: false },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const skip = (page - 1) * limit;

    // Construir filtro de data se fornecido
    const dateFilter = {};
    if (startDate) {
      dateFilter['gte'] = new Date(startDate);
    }
    if (endDate) {
      dateFilter['lte'] = new Date(endDate);
    }

    // Construir where com filtros
    const where: any = { userId };
    if (Object.keys(dateFilter).length > 0) {
      where.completedAt = dateFilter;
    }

    // Buscar atividades
    const activities = await this.prisma.preventionActivity.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        completedAt: 'desc',
      },
    });

    // Contar total para paginação
    const total = await this.prisma.preventionActivity.count({ where });

    return {
      data: activities,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getUserActivities(userId: number) {
    // Verificar se o usuário existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deleted: false },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Buscar atividades do usuário
    const activities = await this.prisma.preventionActivity.findMany({
      where: { userId },
      orderBy: {
        completedAt: 'desc',
      },
    });

    // Agrupar atividades por tipo
    const groupedActivities = activities.reduce((acc, activity) => {
      if (!acc[activity.type]) {
        acc[activity.type] = [];
      }
      acc[activity.type].push(activity);
      return acc;
    }, {});

    // Calcular estatísticas
    const totalDuration = activities.reduce((sum, activity) => sum + activity.duration, 0);
    const activitiesByType = Object.keys(groupedActivities).map(type => ({
      type,
      count: groupedActivities[type].length,
      totalDuration: groupedActivities[type].reduce((sum, activity) => sum + activity.duration, 0),
    }));

    return {
      activities,
      stats: {
        totalActivities: activities.length,
        totalDuration,
        activitiesByType,
      },
    };
  }

  // Método para semear dados iniciais (usado apenas em desenvolvimento)
  async seedInitialData() {
    // Verificar se já existem dados
    const tipsCount = await this.prisma.preventionTip.count();


    if (tipsCount === 0) {
      // Criar dicas de prevenção
      await this.prisma.preventionTip.createMany({
        data: [
          {
            title: 'Regra 20-20-20',
            description: 'A cada 20 minutos, olhe para algo a 20 pés (6 metros) de distância por 20 segundos para reduzir a fadiga ocular.',
            category: 'Uso de telas',
          },
          {
            title: 'Hidratação adequada',
            description: 'Beba pelo menos 2 litros de água por dia para manter seus olhos hidratados.',
            category: 'Saúde geral',
          },
          {
            title: 'Proteção UV',
            description: 'Use óculos de sol com proteção UV ao ar livre, mesmo em dias nublados.',
            category: 'Proteção',
          },
        ],
      });
    }


  }
}
