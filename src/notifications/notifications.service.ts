import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationDto } from './dto/notification.dto';
import { ReadNotificationResponseDto } from './dto/read-notification.dto';
import { ReadAllNotificationsResponseDto } from './dto/read-all-notifications.dto';
import { WebsocketService } from '../websocket/websocket.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private websocketService: WebsocketService
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
        'notification_updated',
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
        'all_notifications_read',
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
  ): Promise<NotificationDto> {
    // Criar a notificação no banco de dados
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
      },
    });

    this.logger.log(`Notificação criada para o usuário ${userId}: ${title}`);

    // Enviar notificação via WebSocket se o usuário estiver conectado
    if (this.websocketService.isUserConnected(userId)) {
      this.websocketService.sendNotificationToUser(
        userId,
        'new_notification',
        notification
      );
      this.logger.log(`Notificação enviada via WebSocket para o usuário ${userId}`);
    } else {
      this.logger.log(`Usuário ${userId} não está conectado via WebSocket. Notificação salva apenas no banco de dados.`);
    }

    return notification;
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
