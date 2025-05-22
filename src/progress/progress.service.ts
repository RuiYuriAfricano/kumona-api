import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}

  async getProgressSummary(userId: number) {
    // Verificar se o usuário existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deleted: false },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Buscar diagnósticos do usuário
    const diagnoses = await this.prisma.diagnosis.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (diagnoses.length === 0) {
      return {
        message: 'Nenhum diagnóstico encontrado para gerar resumo de progresso',
        hasDiagnoses: false,
      };
    }

    // Calcular pontuação média de saúde ocular
    const averageScore = diagnoses.reduce((sum, diagnosis) => sum + diagnosis.score, 0) / diagnoses.length;

    // Obter diagnóstico mais recente
    const latestDiagnosis = diagnoses[0];

    // Obter diagnóstico anterior para comparação
    const previousDiagnosis = diagnoses.length > 1 ? diagnoses[1] : null;

    // Calcular tendência
    let trend = 'stable';
    let scoreDifference = 0;
    
    if (previousDiagnosis) {
      scoreDifference = latestDiagnosis.score - previousDiagnosis.score;
      if (scoreDifference > 5) {
        trend = 'improving';
      } else if (scoreDifference < -5) {
        trend = 'declining';
      }
    }

    // Buscar atividades de prevenção
    const preventionActivities = await this.prisma.preventionActivity.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
    });

    // Calcular estatísticas de atividades
    const totalActivities = preventionActivities.length;
    const totalDuration = preventionActivities.reduce((sum, activity) => sum + activity.duration, 0);
    
    // Agrupar atividades por tipo
    const activitiesByType = preventionActivities.reduce((acc, activity) => {
      if (!acc[activity.type]) {
        acc[activity.type] = 0;
      }
      acc[activity.type]++;
      return acc;
    }, {});

    return {
      hasDiagnoses: true,
      latestDiagnosis,
      averageScore,
      trend,
      scoreDifference,
      preventionStats: {
        totalActivities,
        totalDuration,
        activitiesByType,
      },
      recommendations: this.generateRecommendations(latestDiagnosis, trend, totalActivities),
    };
  }

  async getChartData(userId: number, type: string, period: string) {
    // Verificar se o usuário existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deleted: false },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Validar tipo de gráfico
    if (!['score', 'activities', 'conditions'].includes(type)) {
      throw new BadRequestException('Tipo de gráfico inválido');
    }

    // Calcular intervalo de datas com base no período
    const endDate = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(endDate.getMonth() - 1); // Padrão: último mês
    }

    // Buscar dados com base no tipo de gráfico
    switch (type) {
      case 'score':
        return this.getScoreChartData(userId, startDate, endDate);
      case 'activities':
        return this.getActivitiesChartData(userId, startDate, endDate);
      case 'conditions':
        return this.getConditionsChartData(userId, startDate, endDate);
    }
  }

  private async getScoreChartData(userId: number, startDate: Date, endDate: Date) {
    const diagnoses = await this.prisma.diagnosis.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        score: true,
        createdAt: true,
      },
    });

    return {
      type: 'score',
      labels: diagnoses.map(d => d.createdAt.toISOString().split('T')[0]),
      datasets: [
        {
          label: 'Pontuação de Saúde Ocular',
          data: diagnoses.map(d => d.score),
        },
      ],
    };
  }

  private async getActivitiesChartData(userId: number, startDate: Date, endDate: Date) {
    const activities = await this.prisma.preventionActivity.findMany({
      where: {
        userId,
        completedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        completedAt: 'asc',
      },
    });

    // Agrupar atividades por data
    const groupedByDate = activities.reduce((acc, activity) => {
      const date = activity.completedAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { exercise: 0, rest: 0, medication: 0 };
      }
      acc[date][activity.type]++;
      return acc;
    }, {});

    const dates = Object.keys(groupedByDate).sort();

    return {
      type: 'activities',
      labels: dates,
      datasets: [
        {
          label: 'Exercícios',
          data: dates.map(date => groupedByDate[date].exercise),
        },
        {
          label: 'Descanso',
          data: dates.map(date => groupedByDate[date].rest),
        },
        {
          label: 'Medicação',
          data: dates.map(date => groupedByDate[date].medication),
        },
      ],
    };
  }

  private async getConditionsChartData(userId: number, startDate: Date, endDate: Date) {
    const diagnoses = await this.prisma.diagnosis.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        condition: true,
      },
    });

    // Contar ocorrências de cada condição
    const conditionCounts = diagnoses.reduce((acc, diagnosis) => {
      if (!acc[diagnosis.condition]) {
        acc[diagnosis.condition] = 0;
      }
      acc[diagnosis.condition]++;
      return acc;
    }, {});

    return {
      type: 'conditions',
      labels: Object.keys(conditionCounts),
      datasets: [
        {
          label: 'Condições Detectadas',
          data: Object.values(conditionCounts),
        },
      ],
    };
  }

  private generateRecommendations(latestDiagnosis, trend, totalActivities) {
    const recommendations = [];

    // Recomendações baseadas no diagnóstico mais recente
    if (latestDiagnosis) {
      if (latestDiagnosis.score < 50) {
        recommendations.push('Consulte um oftalmologista o mais breve possível para avaliação detalhada.');
      }
      
      if (latestDiagnosis.severity === 'high') {
        recommendations.push('Sua condição requer atenção médica imediata. Não adie a consulta com um especialista.');
      }
    }

    // Recomendações baseadas na tendência
    if (trend === 'declining') {
      recommendations.push('Sua saúde ocular está em declínio. Considere aumentar a frequência de exercícios oculares.');
    }

    // Recomendações baseadas nas atividades
    if (totalActivities < 5) {
      recommendations.push('Você tem poucas atividades de prevenção registradas. Tente incorporar mais exercícios oculares na sua rotina diária.');
    }

    // Recomendações gerais
    recommendations.push('Mantenha uma dieta rica em vitaminas A, C e E para promover a saúde ocular.');
    recommendations.push('Pratique a regra 20-20-20: a cada 20 minutos, olhe para algo a 20 pés (6 metros) de distância por 20 segundos.');

    return recommendations;
  }
}
