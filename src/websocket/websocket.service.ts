import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebsocketService {
  private readonly logger = new Logger(WebsocketService.name);
  private server: Server;
  private userConnections: Map<number, Set<Socket>> = new Map();

  constructor(private prisma: PrismaService) {}

  setServer(server: Server) {
    this.server = server;
  }

  registerConnection(client: Socket) {
    const userId = client.data.userId;
    if (!userId) {
      this.logger.error('Attempted to register connection without userId');
      return;
    }

    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }

    this.userConnections.get(userId).add(client);
    this.logger.log(`Registered connection for user ${userId}. Total connections: ${this.userConnections.get(userId).size}`);
  }

  removeConnection(client: Socket) {
    const userId = client.data.userId;
    if (!userId || !this.userConnections.has(userId)) {
      return;
    }

    this.userConnections.get(userId).delete(client);
    
    // Remover o conjunto se não houver mais conexões
    if (this.userConnections.get(userId).size === 0) {
      this.userConnections.delete(userId);
    }
    
    this.logger.log(`Removed connection for user ${userId}`);
  }

  isUserConnected(userId: number): boolean {
    return this.userConnections.has(userId) && this.userConnections.get(userId).size > 0;
  }

  getUserConnectionCount(userId: number): number {
    if (!this.userConnections.has(userId)) {
      return 0;
    }
    return this.userConnections.get(userId).size;
  }

  // Enviar notificação para um usuário específico
  async sendNotificationToUser(userId: number, event: string, data: any) {
    this.logger.log(`🌐 [WebSocketService] ===== ENVIANDO NOTIFICAÇÃO VIA WEBSOCKET =====`);
    this.logger.log(`🌐 [WebSocketService] UserId: ${userId}`);
    this.logger.log(`🌐 [WebSocketService] Event: ${event}`);
    this.logger.log(`🌐 [WebSocketService] Data:`, JSON.stringify(data, null, 2));

    const isConnected = this.userConnections.has(userId);
    this.logger.log(`🌐 [WebSocketService] Usuário conectado: ${isConnected}`);

    if (!isConnected) {
      this.logger.log(`🌐 [WebSocketService] User ${userId} is not connected, storing notification`);

      // Armazenar a notificação no banco de dados
      await this.prisma.notification.create({
        data: {
          userId,
          title: data.title || 'Nova notificação',
          message: data.message || JSON.stringify(data),
          type: data.type || 'info',
        },
      });

      this.logger.log(`🌐 [WebSocketService] Notificação armazenada no banco para usuário desconectado`);
      return false;
    }

    const connections = this.userConnections.get(userId);
    this.logger.log(`🌐 [WebSocketService] Enviando para ${connections.size} conexões...`);

    // Enviar apenas para a primeira conexão ativa para evitar duplicatas
    const firstConnection = Array.from(connections)[0];
    if (firstConnection) {
      this.logger.log(`🌐 [WebSocketService] Emitindo evento '${event}' para primeira conexão ativa: ${firstConnection.id}`);
      firstConnection.emit(event, data);
      this.logger.log(`🌐 [WebSocketService] ✅ Notificação enviada para usuário ${userId} (1 de ${connections.size} conexões)`);
    } else {
      this.logger.log(`🌐 [WebSocketService] ❌ Nenhuma conexão ativa encontrada para usuário ${userId}`);
      return false;
    }

    return true;
  }

  // Enviar notificação para todos os usuários
  sendNotificationToAll(event: string, data: any) {
    this.server.emit(event, data);
    this.logger.log(`Broadcast notification to all users`);
    return true;
  }

  // Enviar notificação para todos os usuários exceto o remetente
  sendNotificationToOthers(senderUserId: number, event: string, data: any) {
    for (const [userId, connections] of this.userConnections.entries()) {
      if (userId !== senderUserId) {
        for (const client of connections) {
          client.emit(event, data);
        }
      }
    }
    
    this.logger.log(`Sent notification to all users except ${senderUserId}`);
    return true;
  }
}
