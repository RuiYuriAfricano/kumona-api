import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressSummaryDto } from './dto/progress-summary.dto';
import { ProgressChartsDto } from './dto/progress-charts.dto';
import { ProgressHistoryItemDto } from './dto/progress-history.dto';

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}

  async getProgressSummary(userId: number): Promise<ProgressSummaryDto> {
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
      throw new NotFoundException('Nenhum diagnóstico encontrado para gerar resumo de progresso');
    }

    // Buscar atividades de prevenção do usuário
    const preventionActivities = await this.prisma.preventionActivity.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
    });

    // Calcular estatísticas
    const currentScore = diagnoses.length > 0 ? diagnoses[0].score : 0;
    const previousScore = diagnoses.length > 1 ? diagnoses[1].score : 0;
    const scoreChange = previousScore > 0
      ? Math.round(((currentScore - previousScore) / previousScore) * 100)
      : 0;

    // Calcular estatísticas de tempo de tela
    const screenTimeActivities = preventionActivities.filter(a => a.type === 'rest');
    const currentMonthScreenTime = this.calculateAverageScreenTime(screenTimeActivities, 30);
    const previousMonthScreenTime = this.calculateAverageScreenTime(screenTimeActivities, 60, 30);
    const screenTimeChange = previousMonthScreenTime > 0
      ? Math.round(((currentMonthScreenTime - previousMonthScreenTime) / previousMonthScreenTime) * 100)
      : 0;

    // Calcular estatísticas de pausas
    const currentMonthBreaks = this.countActivitiesInPeriod(screenTimeActivities, 30);
    const previousMonthBreaks = this.countActivitiesInPeriod(screenTimeActivities, 60, 30);
    const breaksAvg = Math.round(currentMonthBreaks / 30);
    const breaksChange = previousMonthBreaks > 0
      ? Math.round(((currentMonthBreaks - previousMonthBreaks) / previousMonthBreaks) * 100)
      : 0;

    // Calcular estatísticas de exercícios
    const exerciseActivities = preventionActivities.filter(a => a.type === 'exercise');
    const currentMonthExercises = this.countActivitiesInPeriod(exerciseActivities, 30);
    const previousMonthExercises = this.countActivitiesInPeriod(exerciseActivities, 60, 30);
    const exercisesChange = previousMonthExercises > 0
      ? Math.round(((currentMonthExercises - previousMonthExercises) / previousMonthExercises) * 100)
      : 0;

    // Formatar tempo de tela
    const hours = Math.floor(currentMonthScreenTime / 60);
    const minutes = currentMonthScreenTime % 60;
    const screenTimeAvg = `${hours}h ${minutes}min`;

    return {
      currentScore,
      previousScore,
      scoreChange,
      screenTimeAvg,
      screenTimeChange,
      breaksAvg,
      breaksChange,
      exercisesCompleted: currentMonthExercises,
      exercisesChange,
    };
  }

  private calculateAverageScreenTime(activities: any[], days: number, offset = 0): number {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days - offset);
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() - offset);

    const filteredActivities = activities.filter(a => {
      const activityDate = new Date(a.completedAt);
      return activityDate >= startDate && activityDate <= endDate;
    });

    const totalMinutes = filteredActivities.reduce((sum, a) => sum + a.duration, 0);
    return Math.round(totalMinutes / days);
  }

  private countActivitiesInPeriod(activities: any[], days: number, offset = 0): number {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days - offset);
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() - offset);

    return activities.filter(a => {
      const activityDate = new Date(a.completedAt);
      return activityDate >= startDate && activityDate <= endDate;
    }).length;
  }

  async getProgressCharts(userId: number): Promise<ProgressChartsDto> {
    // Verificar se o usuário existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deleted: false },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Buscar diagnósticos do usuário (últimos 7)
    const diagnoses = await this.prisma.diagnosis.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: 7,
    });

    if (diagnoses.length === 0) {
      throw new NotFoundException('Nenhum diagnóstico encontrado para gerar gráficos');
    }

    // Extrair dados para gráficos
    const scoreHistory = diagnoses.map(d => d.score);
    const diagnosisDates = diagnoses.map(d => d.createdAt.toISOString().split('T')[0]);

    // Buscar atividades de prevenção do usuário (últimos 7 meses)
    const sevenMonthsAgo = new Date();
    sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

    const preventionActivities = await this.prisma.preventionActivity.findMany({
      where: {
        userId,
        completedAt: {
          gte: sevenMonthsAgo
        }
      },
      orderBy: { completedAt: 'asc' },
    });

    // Agrupar exercícios por mês
    const exercisesByMonth = {};
    const screenTimeByMonth = {};

    preventionActivities.forEach(activity => {
      const date = new Date(activity.completedAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;

      if (!exercisesByMonth[monthKey]) {
        exercisesByMonth[monthKey] = 0;
      }

      if (!screenTimeByMonth[monthKey]) {
        screenTimeByMonth[monthKey] = 0;
      }

      if (activity.type === 'exercise') {
        exercisesByMonth[monthKey]++;
      }

      if (activity.type === 'rest') {
        screenTimeByMonth[monthKey] += activity.duration;
      }
    });

    // Converter para arrays para o formato esperado
    const exerciseHistory = Object.keys(exercisesByMonth).map(date => ({
      date,
      count: exercisesByMonth[date]
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const screenTimeHistory = Object.keys(screenTimeByMonth).map(date => ({
      date,
      minutes: screenTimeByMonth[date]
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      scoreHistory,
      diagnosisDates,
      exerciseHistory,
      screenTimeHistory
    };
  }

  async getProgressHistory(userId: number): Promise<ProgressHistoryItemDto[]> {
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

    // Buscar atividades de prevenção do usuário
    const preventionActivities = await this.prisma.preventionActivity.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
    });

    // Agrupar dados por semana
    const weeklyData = {};

    // Processar diagnósticos
    diagnoses.forEach(diagnosis => {
      const date = new Date(diagnosis.createdAt);
      // Obter o início da semana (domingo)
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          date: weekKey,
          score: 0,
          activities: 0,
          screenTime: 0,
          diagnosisCount: 0
        };
      }

      // Somar pontuações para calcular média depois
      weeklyData[weekKey].score += diagnosis.score;
      weeklyData[weekKey].diagnosisCount++;
    });

    // Processar atividades
    preventionActivities.forEach(activity => {
      const date = new Date(activity.completedAt);
      // Obter o início da semana (domingo)
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          date: weekKey,
          score: 0,
          activities: 0,
          screenTime: 0,
          diagnosisCount: 0
        };
      }

      weeklyData[weekKey].activities++;

      if (activity.type === 'rest') {
        weeklyData[weekKey].screenTime += activity.duration;
      }
    });

    // Calcular médias e formatar resultado
    const result = Object.values(weeklyData).map((week: any) => {
      // Calcular média de pontuação se houver diagnósticos
      if (week.diagnosisCount > 0) {
        week.score = Math.round(week.score / week.diagnosisCount);
      }

      // Remover campo auxiliar
      delete week.diagnosisCount;

      return week;
    });

    // Ordenar por data (mais recente primeiro)
    return result.sort((a: any, b: any) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }


}
