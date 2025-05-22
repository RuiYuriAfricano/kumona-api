import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePreventionActivityDto } from './dto/create-prevention-activity.dto';

@Injectable()
export class PreventionService {
  constructor(private prisma: PrismaService) {}

  async getPreventionTips(category?: string, limit = 10) {
    const where = category ? { category } : {};
    
    return this.prisma.preventionTip.findMany({
      where,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getEyeExercises() {
    return this.prisma.eyeExercise.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async trackPreventionActivity(
    userId: number,
    createActivityDto: CreatePreventionActivityDto,
  ) {
    // Verificar se o usuário existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deleted: false },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Criar a atividade de prevenção
    const activity = await this.prisma.preventionActivity.create({
      data: {
        ...createActivityDto,
        userId,
      },
    });

    return activity;
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
