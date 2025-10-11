import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface CreateReminderDto {
  type: string;
  title: string;
  message: string;
  frequency: string;
  time: string;
  days?: string[];
  notifyEmail?: boolean;
  notifyPush?: boolean;
  notifyInApp?: boolean;
  metadata?: any;
}

export interface NotificationData {
  userId: number;
  type: string;
  title: string;
  message: string;
  channel: string;
  metadata?: any;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Cria um novo lembrete
   */
  async createReminder(userId: number, reminderData: CreateReminderDto) {
    this.logger.log(`📅 [Notifications] Criando lembrete para usuário ${userId}: ${reminderData.type}`);

    try {
      // Calcular próximo agendamento
      const nextScheduled = this.calculateNextScheduled(reminderData.frequency, reminderData.time, reminderData.days);

      const reminder = await this.prisma.reminder.create({
        data: {
          userId,
          type: reminderData.type,
          title: reminderData.title,
          message: reminderData.message,
          frequency: reminderData.frequency,
          time: reminderData.time,
          days: reminderData.days || [],
          notifyEmail: reminderData.notifyEmail || false,
          notifyPush: reminderData.notifyPush || true,
          notifyInApp: reminderData.notifyInApp || true,
          nextScheduled,
          metadata: reminderData.metadata
        }
      });

      this.logger.log(`✅ [Notifications] Lembrete criado com ID ${reminder.id}, próximo envio: ${nextScheduled}`);
      return reminder;

    } catch (error) {
      this.logger.error(`❌ [Notifications] Erro ao criar lembrete para usuário ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Calcula próximo agendamento baseado na frequência
   */
  private calculateNextScheduled(frequency: string, time: string, days?: string[]): Date {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    
    const nextScheduled = new Date();
    nextScheduled.setHours(hours, minutes, 0, 0);

    switch (frequency) {
      case 'daily':
        // Se o horário já passou hoje, agendar para amanhã
        if (nextScheduled <= now) {
          nextScheduled.setDate(nextScheduled.getDate() + 1);
        }
        break;

      case 'weekly':
        if (days && days.length > 0) {
          // Encontrar próximo dia da semana
          const currentDay = now.getDay();
          const targetDays = days.map(day => this.dayNameToNumber(day)).sort();
          
          let nextDay = targetDays.find(day => day > currentDay);
          if (!nextDay) {
            nextDay = targetDays[0] + 7; // Próxima semana
          }
          
          const daysToAdd = nextDay - currentDay;
          nextScheduled.setDate(nextScheduled.getDate() + daysToAdd);
          
          // Se é hoje mas o horário já passou
          if (daysToAdd === 0 && nextScheduled <= now) {
            nextScheduled.setDate(nextScheduled.getDate() + 7);
          }
        }
        break;

      case 'monthly':
        // Mesmo dia do próximo mês
        nextScheduled.setMonth(nextScheduled.getMonth() + 1);
        if (nextScheduled <= now) {
          nextScheduled.setMonth(nextScheduled.getMonth() + 1);
        }
        break;
    }

    return nextScheduled;
  }

  /**
   * Converte nome do dia para número (0 = domingo)
   */
  private dayNameToNumber(dayName: string): number {
    const days = {
      'sunday': 0, 'domingo': 0,
      'monday': 1, 'segunda': 1,
      'tuesday': 2, 'terca': 2,
      'wednesday': 3, 'quarta': 3,
      'thursday': 4, 'quinta': 4,
      'friday': 5, 'sexta': 5,
      'saturday': 6, 'sabado': 6
    };
    return days[dayName.toLowerCase()] || 0;
  }

  /**
   * Envia notificação
   */
  async sendNotification(notificationData: NotificationData): Promise<void> {
    this.logger.log(`📱 [Notifications] Enviando notificação ${notificationData.type} para usuário ${notificationData.userId}`);

    try {
      // Registrar log da notificação
      const notificationLog = await this.prisma.notificationLog.create({
        data: {
          userId: notificationData.userId,
          type: notificationData.type,
          title: notificationData.title,
          message: notificationData.message,
          channel: notificationData.channel,
          metadata: notificationData.metadata,
          sent: false
        }
      });

      // Simular envio da notificação (aqui você integraria com serviços reais)
      let success = false;
      
      switch (notificationData.channel) {
        case 'push':
          success = await this.sendPushNotification(notificationData);
          break;
        case 'email':
          success = await this.sendEmailNotification(notificationData);
          break;
        case 'in_app':
          success = await this.sendInAppNotification(notificationData);
          break;
      }

      // Atualizar status do log
      await this.prisma.notificationLog.update({
        where: { id: notificationLog.id },
        data: {
          sent: success,
          sentAt: success ? new Date() : null,
          delivered: success, // Assumindo entrega imediata para simplificar
          deliveredAt: success ? new Date() : null
        }
      });

      if (success) {
        this.logger.log(`✅ [Notifications] Notificação enviada com sucesso via ${notificationData.channel}`);
      } else {
        this.logger.warn(`⚠️ [Notifications] Falha ao enviar notificação via ${notificationData.channel}`);
      }

    } catch (error) {
      this.logger.error(`❌ [Notifications] Erro ao enviar notificação:`, error);
      throw error;
    }
  }

  /**
   * Simula envio de push notification
   */
  private async sendPushNotification(data: NotificationData): Promise<boolean> {
    // Aqui você integraria com Firebase Cloud Messaging, OneSignal, etc.
    this.logger.debug(`📱 Push notification: ${data.title} - ${data.message}`);
    return true; // Simular sucesso
  }

  /**
   * Simula envio de email
   */
  private async sendEmailNotification(data: NotificationData): Promise<boolean> {
    // Aqui você integraria com SendGrid, AWS SES, etc.
    this.logger.debug(`📧 Email notification: ${data.title} - ${data.message}`);
    return true; // Simular sucesso
  }

  /**
   * Simula notificação in-app
   */
  private async sendInAppNotification(data: NotificationData): Promise<boolean> {
    // Notificações in-app são geralmente armazenadas no banco e consultadas pelo frontend
    this.logger.debug(`🔔 In-app notification: ${data.title} - ${data.message}`);
    return true; // Simular sucesso
  }

  /**
   * Processa lembretes agendados (executado via cron)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledReminders(): Promise<void> {
    const now = new Date();
    
    try {
      // Buscar lembretes que devem ser enviados
      const reminders = await this.prisma.reminder.findMany({
        where: {
          isActive: true,
          nextScheduled: {
            lte: now
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (reminders.length === 0) {
        return;
      }

      this.logger.log(`📅 [Notifications] Processando ${reminders.length} lembretes agendados`);

      for (const reminder of reminders) {
        try {
          // Enviar notificações nos canais configurados
          const channels = [];
          if (reminder.notifyPush) channels.push('push');
          if (reminder.notifyEmail) channels.push('email');
          if (reminder.notifyInApp) channels.push('in_app');

          for (const channel of channels) {
            await this.sendNotification({
              userId: reminder.userId,
              type: reminder.type,
              title: reminder.title,
              message: reminder.message,
              channel,
              metadata: {
                reminderId: reminder.id,
                frequency: reminder.frequency,
                ...(reminder.metadata && typeof reminder.metadata === 'object' ? reminder.metadata : {})
              }
            });
          }

          // Calcular próximo agendamento
          const nextScheduled = this.calculateNextScheduled(
            reminder.frequency,
            reminder.time,
            reminder.days
          );

          // Atualizar lembrete
          await this.prisma.reminder.update({
            where: { id: reminder.id },
            data: {
              lastSent: now,
              nextScheduled
            }
          });

          this.logger.log(`✅ [Notifications] Lembrete ${reminder.id} processado, próximo: ${nextScheduled}`);

        } catch (error) {
          this.logger.error(`❌ [Notifications] Erro ao processar lembrete ${reminder.id}:`, error);
        }
      }

    } catch (error) {
      this.logger.error(`❌ [Notifications] Erro ao processar lembretes agendados:`, error);
    }
  }

  /**
   * Obtém lembretes do usuário
   */
  async getUserReminders(userId: number) {
    return this.prisma.reminder.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Obtém notificações in-app do usuário
   */
  async getUserNotifications(userId: number, limit: number = 20) {
    return this.prisma.notificationLog.findMany({
      where: { 
        userId,
        channel: 'in_app'
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Marca notificação como lida
   */
  async markNotificationAsRead(notificationId: number, userId: number) {
    return this.prisma.notificationLog.update({
      where: { 
        id: notificationId,
        userId // Garantir que o usuário só pode marcar suas próprias notificações
      },
      data: {
        read: true,
        readAt: new Date()
      }
    });
  }

  /**
   * Desativa lembrete
   */
  async deactivateReminder(reminderId: number, userId: number) {
    return this.prisma.reminder.update({
      where: { 
        id: reminderId,
        userId // Garantir que o usuário só pode desativar seus próprios lembretes
      },
      data: {
        isActive: false
      }
    });
  }
}
