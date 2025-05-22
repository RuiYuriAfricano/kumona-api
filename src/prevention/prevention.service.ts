import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePreventionActivityDto } from './dto/create-prevention-activity.dto';
import { PreventionActivityDto } from './dto/prevention-activity.dto';
import { PreventionTipDto } from './dto/prevention-tip.dto';
import { EyeExerciseDto } from './dto/eye-exercise.dto';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';

@Injectable()
export class PreventionService {
  constructor(private prisma: PrismaService) {}

  async getPreventionTips(category?: string, limit = 10): Promise<PreventionTipDto[]> {
    const where = category ? { category } : {};

    return this.prisma.preventionTip.findMany({
      where,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getEyeExercises(): Promise<EyeExerciseDto[]> {
    return this.prisma.eyeExercise.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
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
