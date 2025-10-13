import { Injectable, NotFoundException, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationDto } from './dto/notification.dto';
import { ReadNotificationResponseDto } from './dto/read-notification.dto';
import { ReadAllNotificationsResponseDto } from './dto/read-all-notifications.dto';
import { WebsocketService } from '../websocket/websocket.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => WebsocketService))
    private websocketService: WebsocketService,
    private emailService: EmailService
  ) {}

  async getUserNotifications(userId: number): Promise<NotificationDto[]> {
    // Verificar se o usuário existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deleted: false },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Buscar notificações do usuário
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return notifications;
  }

  async markNotificationAsRead(
    userId: number,
    notificationId: number,
  ): Promise<ReadNotificationResponseDto> {
    // Verificar se o usuário existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deleted: false },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verificar se a notificação existe e pertence ao usuário
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notificação não encontrada');
    }

    // Marcar como lida
    const updatedNotification = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    const result = {
      id: updatedNotification.id,
      read: updatedNotification.read,
      updatedAt: new Date(),
    };

    // Enviar atualização via WebSocket se o usuário estiver conectado
    if (this.websocketService.isUserConnected(userId)) {
      this.websocketService.sendNotificationToUser(
        userId,
        'notification',
        result
      );
    }

    return result;
  }

  async markAllNotificationsAsRead(
    userId: number,
  ): Promise<ReadAllNotificationsResponseDto> {
    // Verificar se o usuário existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deleted: false },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Marcar todas as notificações como lidas
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    const response = {
      success: true,
      count: result.count,
      updatedAt: new Date(),
    };

    // Enviar atualização via WebSocket se o usuário estiver conectado
    if (this.websocketService.isUserConnected(userId)) {
      this.websocketService.sendNotificationToUser(
        userId,
        'notification',
        response
      );
    }

    return response;
  }

  // Método para criar uma notificação (usado internamente)
  async createNotification(
    userId: number,
    title: string,
    message: string,
    type: string,
    sendEmail: boolean = false,
    emailSubject?: string,
  ): Promise<NotificationDto> {
    this.logger.log(`🔔 [NotificationsService] ===== CRIANDO NOTIFICAÇÃO =====`);
    this.logger.log(`🔔 [NotificationsService] UserId: ${userId}`);
    this.logger.log(`🔔 [NotificationsService] Title: ${title}`);
    this.logger.log(`🔔 [NotificationsService] Message: ${message}`);
    this.logger.log(`🔔 [NotificationsService] Type: ${type}`);

    // Criar a notificação no banco de dados
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
      },
    });

    this.logger.log(`🔔 [NotificationsService] Notificação criada no banco - ID: ${notification.id}`);

    // Enviar email se solicitado
    if (sendEmail) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true },
        });

        if (user) {
          await this.emailService.sendNotificationEmail(
            user.email,
            emailSubject || title,
            message,
            user.name
          );
          this.logger.log(`Email de notificação enviado para ${user.email}`);
        }
      } catch (emailError) {
        this.logger.error('Erro ao enviar email de notificação:', emailError);
      }
    }

    // Enviar notificação via WebSocket se o usuário estiver conectado
    this.logger.log(`🔔 [NotificationsService] Verificando conexão WebSocket para usuário ${userId}...`);
    const isConnected = this.websocketService.isUserConnected(userId);
    this.logger.log(`🔔 [NotificationsService] Usuário ${userId} conectado via WebSocket: ${isConnected}`);

    if (isConnected) {
      this.logger.log(`🔔 [NotificationsService] Enviando notificação via WebSocket...`);
      const sent = await this.websocketService.sendNotificationToUser(
        userId,
        'notification',
        notification
      );
      this.logger.log(`🔔 [NotificationsService] Notificação WebSocket enviada: ${sent}`);
    } else {
      this.logger.log(`🔔 [NotificationsService] Usuário ${userId} não está conectado via WebSocket. Notificação salva apenas no banco de dados.`);
    }

    this.logger.log(`🔔 [NotificationsService] ===== NOTIFICAÇÃO PROCESSADA =====`);
    return notification;
  }

  // Método para enviar notificação de resultado de diagnóstico
  async sendDiagnosisResultNotification(userId: number, diagnosisResult: any): Promise<NotificationDto> {
    const severity = diagnosisResult.severity || 'low';
    let title = 'Resultado do Diagnóstico Disponível';
    let message = `Seu diagnóstico foi concluído. Resultado: ${diagnosisResult.condition}`;
    let type = 'info';

    // Personalizar mensagem baseada na severidade
    if (severity === 'high') {
      type = 'error';
      title = '⚠️ Diagnóstico Requer Atenção';
      message = `Seu diagnóstico indica: ${diagnosisResult.condition}. Recomendamos consultar um oftalmologista o mais breve possível.`;
    } else if (severity === 'medium') {
      type = 'warning';
      title = '🔍 Diagnóstico Disponível';
      message = `Seu diagnóstico indica: ${diagnosisResult.condition}. Considere agendar uma consulta para avaliação.`;
    } else {
      type = 'success';
      title = '✅ Diagnóstico Concluído';
      message = `Seu diagnóstico indica: ${diagnosisResult.condition}. Continue cuidando bem da sua visão!`;
    }

    return this.createNotification(userId, title, message, type, true, title);
  }

  // Método para enviar lembrete de prevenção
  async sendPreventionReminder(userId: number, reminderType: string): Promise<NotificationDto> {
    const reminders = {
      'eye-rest': {
        title: '👁️ Hora de Descansar os Olhos',
        message: 'Lembre-se de fazer uma pausa e descansar os olhos por alguns minutos. Olhe para longe da tela!',
      },
      'eye-drops': {
        title: '💧 Hora do Colírio',
        message: 'Não esqueça de usar seu colírio lubrificante conforme recomendado.',
      },
      'checkup': {
        title: '📅 Lembrete de Consulta',
        message: 'Está na hora de agendar sua consulta oftalmológica de rotina.',
      },
    };

    const reminder = reminders[reminderType] || {
      title: '🔔 Lembrete de Saúde Ocular',
      message: 'Cuide bem da sua visão!',
    };

    return this.createNotification(userId, reminder.title, reminder.message, 'info', true, reminder.title);
  }

  // Método para enviar uma notificação para todos os usuários
  async broadcastNotification(
    title: string,
    message: string,
    type: string,
  ): Promise<number> {
    // Buscar todos os usuários ativos
    const users = await this.prisma.user.findMany({
      where: { deleted: false },
      select: { id: true },
    });

    let count = 0;

    // Criar notificações para cada usuário
    for (const user of users) {
      await this.createNotification(user.id, title, message, type);
      count++;
    }

    // Enviar para todos os usuários conectados via WebSocket
    this.websocketService.sendNotificationToAll('broadcast_notification', {
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Notificação em massa enviada para ${count} usuários`);
    return count;
  }
}
