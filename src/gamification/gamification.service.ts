import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface ActivityData {
  activityType: string;
  activityName?: string;
  duration?: number;
  metadata?: any;
}

export interface PointsResult {
  points: number;
  streakBonus: number;
  totalPoints: number;
  newLevel?: number;
  badges?: string[];
}

export interface UserProgressData {
  dailyPoints: number;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  level: number;
  experience: number;
  badges: string[];

  totalTips: number;
  totalReminders: number;
}

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService
  ) {}

  /**
   * Calcula pontos baseado no tipo de atividade
   */
  private calculateBasePoints(activityType: string, duration?: number): number {
    switch (activityType) {
      case 'start_exercise':
        return Math.max(10, (duration || 5) * 2); // Mínimo 10 pontos, 2 pontos por minuto
      case 'complete_exercise':
        return 15;
      case 'set_reminder':
        return 5;
      case 'save_tip':
        return 3;
      case 'view_tip':
        return 1;
      default:
        return 5;
    }
  }

  /**
   * Calcula bonus de streak
   */
  private calculateStreakBonus(streak: number): number {
    if (streak >= 30) return 50; // 1 mês
    if (streak >= 14) return 30; // 2 semanas
    if (streak >= 7) return 20;  // 1 semana
    if (streak >= 3) return 10;  // 3 dias
    return 0;
  }

  /**
   * Calcula nível baseado na experiência total
   */
  private calculateLevel(totalPoints: number): number {
    // Cada nível requer 100 pontos a mais que o anterior
    // Nível 1: 0-99, Nível 2: 100-299, Nível 3: 300-599, etc.
    return Math.floor(Math.sqrt(totalPoints / 100)) + 1;
  }

  /**
   * Verifica se o usuário ganhou novas badges
   */
  private checkNewBadges(userProgress: any, activityType: string, streak: number): string[] {
    const newBadges: string[] = [];
    const currentBadges = userProgress.badges || [];



    // Badges de streak
    if (streak >= 7 && !currentBadges.includes('week_warrior')) {
      newBadges.push('week_warrior');
    }
    if (streak >= 30 && !currentBadges.includes('month_master')) {
      newBadges.push('month_master');
    }

    // Badge de pontos
    if (userProgress.totalPoints >= 1000 && !currentBadges.includes('point_collector')) {
      newBadges.push('point_collector');
    }

    return newBadges;
  }

  /**
   * Registra atividade e calcula pontos
   */
  async recordActivity(userId: number, activityData: ActivityData): Promise<PointsResult> {
    this.logger.log(`🎯 [Gamification] Registrando atividade para usuário ${userId}: ${activityData.activityType}`);

    try {


      // Buscar ou criar progresso do usuário
      let userProgress = await this.prisma.userProgress.findUnique({
        where: { userId }
      });

      if (!userProgress) {
        userProgress = await this.prisma.userProgress.create({
          data: { userId }
        });
      }

      // Calcular pontos base
      const basePoints = this.calculateBasePoints(activityData.activityType, activityData.duration);

      // Verificar e atualizar streak
      const today = new Date().toDateString();
      const lastActivity = userProgress.lastActivityDate?.toDateString();
      
      let currentStreak = userProgress.currentStreak;
      if (lastActivity !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastActivity === yesterday.toDateString()) {
          currentStreak += 1;
        } else if (lastActivity !== today) {
          currentStreak = 1;
        }
      }

      // Calcular bonus de streak
      const streakBonus = this.calculateStreakBonus(currentStreak);
      const totalActivityPoints = basePoints + streakBonus;

      // Atualizar contadores específicos
      // Se a última atividade foi hoje, somar aos pontos diários existentes
      // Caso contrário, resetar os pontos diários para apenas os pontos desta atividade
      const isFirstActivityToday = lastActivity !== today;

      const updateData: any = {
        dailyPoints: isFirstActivityToday ? totalActivityPoints : userProgress.dailyPoints + totalActivityPoints,
        totalPoints: userProgress.totalPoints + totalActivityPoints,
        currentStreak,
        longestStreak: Math.max(userProgress.longestStreak, currentStreak),
        lastActivityDate: new Date()
      };

      this.logger.log(`📊 [Gamification] Atualizando pontos - Primeira atividade hoje: ${isFirstActivityToday}, Pontos diários: ${updateData.dailyPoints}`);

      // Incrementar contadores específicos
      if (activityData.activityType.includes('exercise')) {

      } else if (activityData.activityType.includes('tip')) {
        updateData.totalTips = userProgress.totalTips + 1;
      } else if (activityData.activityType.includes('reminder')) {
        updateData.totalReminders = userProgress.totalReminders + 1;
      }

      // Calcular novo nível
      const newLevel = this.calculateLevel(updateData.totalPoints);
      const leveledUp = newLevel > userProgress.level;
      if (leveledUp) {
        updateData.level = newLevel;
        updateData.experience = updateData.totalPoints;
      }

      // Verificar novas badges
      const newBadges = this.checkNewBadges(userProgress, activityData.activityType, currentStreak);
      if (newBadges.length > 0) {
        updateData.badges = [...(userProgress.badges || []), ...newBadges];
      }

      // Atualizar progresso do usuário
      this.logger.log(`💾 [Gamification] Atualizando progresso do usuário ${userId} com dados:`, updateData);

      const updatedProgress = await this.prisma.userProgress.update({
        where: { userId },
        data: updateData
      });

      this.logger.log(`✅ [Gamification] Progresso atualizado para usuário ${userId}:`, {
        dailyPoints: updatedProgress.dailyPoints,
        totalPoints: updatedProgress.totalPoints,
        currentStreak: updatedProgress.currentStreak,
        level: updatedProgress.level
      });

      // Registrar pontos ganhos
      await this.prisma.userPoints.create({
        data: {
          userId,
          activityType: activityData.activityType,
          activityName: activityData.activityName,
          points: totalActivityPoints,
          description: this.generateActivityDescription(activityData),
          metadata: {
            basePoints,
            streakBonus,
            streak: currentStreak,
            duration: activityData.duration,
            ...activityData.metadata
          }
        }
      });

      // Atualizar progresso específico do exercício se aplicável
      this.logger.log(`🔍 [Gamification] Verificando se deve atualizar exercício - Tipo: "${activityData.activityType}", Nome: "${activityData.activityName}"`);

      // Exercícios foram removidos - não fazer nada

      this.logger.log(`✅ [Gamification] Usuário ${userId} ganhou ${totalActivityPoints} pontos (base: ${basePoints}, streak: ${streakBonus})`);

      // Criar notificações para conquistas
      await this.createAchievementNotifications(userId, {
        points: totalActivityPoints,
        leveledUp,
        newLevel,
        newBadges,
        activityName: activityData.activityName
      });

      return {
        points: basePoints,
        streakBonus,
        totalPoints: totalActivityPoints,
        newLevel: leveledUp ? newLevel : undefined,
        badges: newBadges.length > 0 ? newBadges : undefined
      };

    } catch (error) {
      this.logger.error(`❌ [Gamification] Erro ao registrar atividade para usuário ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Criar notificações para conquistas do usuário
   */
  private async createAchievementNotifications(userId: number, achievements: {
    points: number;
    leveledUp: boolean;
    newLevel?: number;
    newBadges: string[];
    activityName: string;
  }): Promise<void> {
    this.logger.log(`🎮 [Gamification] ===== CRIANDO NOTIFICAÇÕES DE CONQUISTA =====`);
    this.logger.log(`🎮 [Gamification] UserId: ${userId}`);
    this.logger.log(`🎮 [Gamification] Achievements:`, achievements);

    try {
      // Notificação de pontos ganhos
      if (achievements.points > 0) {
        this.logger.log(`🎮 [Gamification] Criando notificação de pontos: ${achievements.points}`);
        await this.notificationsService.createNotification(
          userId,
          '🎯 Pontos Ganhos!',
          `Parabéns! Você ganhou ${achievements.points} pontos com "${achievements.activityName}".`,
          'success'
        );
        this.logger.log(`🎮 [Gamification] ✅ Notificação de pontos criada`);
      }

      // Notificação de novo nível
      if (achievements.leveledUp && achievements.newLevel) {
        this.logger.log(`🎮 [Gamification] Criando notificação de novo nível: ${achievements.newLevel}`);
        await this.notificationsService.createNotification(
          userId,
          '🆙 Novo Nível Alcançado!',
          `Incrível! Você alcançou o nível ${achievements.newLevel}! Continue assim!`,
          'success'
        );
        this.logger.log(`🎮 [Gamification] ✅ Notificação de novo nível criada`);
      }

      // Notificações de novas badges
      if (achievements.newBadges.length > 0) {
        this.logger.log(`🎮 [Gamification] Criando notificações para ${achievements.newBadges.length} badges`);
      }

      for (const badge of achievements.newBadges) {
        const badgeNames = {
          'week_warrior': 'Guerreiro da Semana',
          'month_master': 'Mestre do Mês',
          'point_collector': 'Colecionador de Pontos'
        };

        const badgeName = badgeNames[badge] || badge;
        this.logger.log(`🎮 [Gamification] Criando notificação para badge: ${badgeName}`);
        await this.notificationsService.createNotification(
          userId,
          '🏆 Nova Conquista!',
          `Você desbloqueou a conquista "${badgeName}"! Parabéns pela dedicação!`,
          'success'
        );
        this.logger.log(`🎮 [Gamification] ✅ Notificação de badge criada: ${badgeName}`);
      }

      this.logger.log(`🎮 [Gamification] ===== NOTIFICAÇÕES DE CONQUISTA PROCESSADAS =====`);

    } catch (error) {
      this.logger.error(`❌ [Gamification] Erro ao criar notificações de conquista para usuário ${userId}:`, error);
    }
  }

  /**
   * Gera descrição da atividade
   */
  private generateActivityDescription(activityData: ActivityData): string {
    switch (activityData.activityType) {
      case 'start_exercise':
        return `Exercício iniciado: ${activityData.activityName || 'Exercício ocular'}`;
      case 'complete_exercise':
        return `Exercício completado: ${activityData.activityName || 'Exercício ocular'}`;
      case 'set_reminder':
        return 'Lembrete configurado para exercícios diários';
      case 'save_tip':
        return `Dica salva: ${activityData.activityName || 'Dica de prevenção'}`;
      case 'view_tip':
        return `Dica visualizada: ${activityData.activityName || 'Dica de prevenção'}`;
      default:
        return `Atividade realizada: ${activityData.activityType}`;
    }
  }

  /**
   * Obtém progresso completo do usuário
   */
  async getUserProgress(userId: number): Promise<UserProgressData> {
    this.logger.log(`📊 [Gamification] Buscando progresso do usuário ${userId}`);

    let userProgress = await this.prisma.userProgress.findUnique({
      where: { userId }
    });

    if (!userProgress) {
      this.logger.log(`🆕 [Gamification] Criando novo progresso para usuário ${userId}`);
      userProgress = await this.prisma.userProgress.create({
        data: { userId }
      });
    }

    this.logger.log(`📈 [Gamification] Progresso encontrado para usuário ${userId}:`, {
      dailyPoints: userProgress.dailyPoints,
      totalPoints: userProgress.totalPoints,
      currentStreak: userProgress.currentStreak,
      level: userProgress.level
    });

    return {
      dailyPoints: userProgress.dailyPoints,
      totalPoints: userProgress.totalPoints,
      currentStreak: userProgress.currentStreak,
      longestStreak: userProgress.longestStreak,
      level: userProgress.level,
      experience: userProgress.experience,
      badges: userProgress.badges,
      totalTips: userProgress.totalTips,
      totalReminders: userProgress.totalReminders
    };
  }

  /**
   * Obtém progresso dos exercícios do usuário (removido - exercícios não existem mais)
   */
  async getExerciseProgress(userId: number): Promise<any[]> {
    // Exercícios foram removidos - retornar array vazio
    return [];
  }

  /**
   * Reset diário dos pontos (para ser executado via cron)
   */
  async resetDailyPoints(): Promise<void> {
    this.logger.log('🔄 [Gamification] Resetando pontos diários');
    
    await this.prisma.userProgress.updateMany({
      data: { dailyPoints: 0 }
    });
    
    this.logger.log('✅ [Gamification] Pontos diários resetados');
  }
}
