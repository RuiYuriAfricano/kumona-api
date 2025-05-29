import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PersonalizedContentService } from '../ai/personalized-content.service';
import { CreatePreventionActivityDto } from './dto/create-prevention-activity.dto';
import { PreventionActivityDto } from './dto/prevention-activity.dto';
import { PreventionTipDto } from './dto/prevention-tip.dto';
import { EyeExerciseDto } from './dto/eye-exercise.dto';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';

@Injectable()
export class PreventionService {
  constructor(
    private prisma: PrismaService,
    private personalizedContentService: PersonalizedContentService
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

  async getEyeExercises(userId: number): Promise<EyeExerciseDto[]> {
    // Para novos usuários, sempre retornar array vazio
    // Só mostrar exercícios após o usuário fazer pelo menos um diagnóstico
    const userDiagnoses = await this.prisma.diagnosis.count({
      where: { userId }
    });

    if (userDiagnoses === 0) {
      return [];
    }

    return this.prisma.eyeExercise.findMany({
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

  async getEyeExerciseById(id: number): Promise<EyeExerciseDto> {
    const exercise = await this.prisma.eyeExercise.findUnique({
      where: { id },
    });

    if (!exercise) {
      throw new Error('Exercício não encontrado');
    }

    return exercise;
  }

  async debugUserStatus(userId: number) {
    const userDiagnoses = await this.prisma.diagnosis.count({
      where: { userId }
    });

    const userActivities = await this.prisma.preventionActivity.count({
      where: { userId }
    });

    const totalTips = await this.prisma.preventionTip.count();
    const totalExercises = await this.prisma.eyeExercise.count();

    return {
      userId,
      diagnosesCount: userDiagnoses,
      activitiesCount: userActivities,
      totalTipsInDatabase: totalTips,
      totalExercisesInDatabase: totalExercises,
      shouldShowTips: userDiagnoses > 0,
      shouldShowExercises: userDiagnoses > 0
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

  async getUserExercises(userId: number): Promise<EyeExerciseDto[]> {
    // Verificar se o usuário tem diagnósticos
    const userDiagnoses = await this.prisma.diagnosis.count({
      where: { userId }
    });

    console.log(`[getUserExercises] UserId: ${userId}, Diagnoses: ${userDiagnoses}`);

    if (userDiagnoses === 0) {
      console.log(`[getUserExercises] Usuário ${userId} não tem diagnósticos - retornando array vazio`);
      return [];
    }

    // Verificar se há exercícios personalizados ativos para hoje
    const personalizedExercises = await this.personalizedContentService.getDailyExercises(userId);

    if (personalizedExercises.length === 0) {
      // Gerar exercícios personalizados se não existirem
      console.log(`[getUserExercises] Gerando exercícios personalizados para usuário ${userId}`);
      await this.personalizedContentService.generateDailyExercises(userId);

      // Buscar os exercícios recém-gerados
      const newExercises = await this.personalizedContentService.getDailyExercises(userId);
      console.log(`[getUserExercises] ${newExercises.length} exercícios personalizados gerados para usuário ${userId}`);
      return newExercises;
    }

    console.log(`[getUserExercises] Retornando ${personalizedExercises.length} exercícios personalizados para usuário ${userId}`);
    return personalizedExercises;
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

  async trackPreventionActivity(userId: number, activityDto: CreatePreventionActivityDto): Promise<PreventionActivityDto> {
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

    return activity;
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
    const exercisesCount = await this.prisma.eyeExercise.count();

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

    if (exercisesCount === 0) {
      // Criar exercícios oculares
      await this.prisma.eyeExercise.createMany({
        data: [
          {
            title: 'Palming',
            description: 'Técnica de relaxamento ocular que ajuda a reduzir a tensão nos olhos.',
            instructions: [
              'Esfregue as mãos até ficarem quentes',
              'Coloque as palmas das mãos sobre os olhos fechados',
              'Respire profundamente e relaxe por 1-2 minutos',
            ],
            duration: 2,
          },
          {
            title: 'Movimentos oculares',
            description: 'Exercício para fortalecer os músculos dos olhos e melhorar a flexibilidade.',
            instructions: [
              'Mantenha a cabeça parada',
              'Mova os olhos para cima e para baixo 10 vezes',
              'Mova os olhos para a esquerda e direita 10 vezes',
              'Mova os olhos em círculos 5 vezes em cada direção',
            ],
            duration: 3,
          },
        ],
      });
    }
  }
}
