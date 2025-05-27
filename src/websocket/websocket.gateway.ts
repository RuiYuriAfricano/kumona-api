import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { WebsocketService } from './websocket.service';

@WebSocketGateway({
  cors: {
    origin: '*', // Em produção, defina para a origem específica do seu frontend
    credentials: true,
  },
  path: '/ws',
})
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(WebsocketGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private authService: AuthService,
    private websocketService: WebsocketService,
  ) {}

  afterInit(server: Server) {
    this.websocketService.setServer(server);
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Extrair o token do handshake
      const token = client.handshake.auth.token ||
                    client.handshake.query.token ||
                    client.handshake.headers.authorization?.split(' ')[1];

      this.logger.log(`Token received: ${token ? 'Yes' : 'No'}`);
      this.logger.log(`Auth object:`, client.handshake.auth);
      this.logger.log(`Query object:`, client.handshake.query);

      if (!token) {
        this.logger.error('No token provided');
        client.disconnect();
        return;
      }

      // Verificar o token
      const payload = await this.authService.verifyJwt(token);
      if (!payload) {
        this.logger.error('Invalid token');
        client.disconnect();
        return;
      }

      // Armazenar o ID do usuário no socket
      client.data.userId = payload.sub;

      // Registrar a conexão no serviço
      this.websocketService.registerConnection(client);

      this.logger.log(`Client connected: ${client.id}, User ID: ${payload.sub}`);

      // Enviar mensagem de boas-vindas
      client.emit('connection_established', {
        message: 'Conectado com sucesso ao servidor WebSocket',
        userId: payload.sub,
      });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.websocketService.removeConnection(client);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket) {
    this.logger.debug(`Ping from client ${client.id}`);
    return { event: 'pong', data: { timestamp: new Date().toISOString() } };
  }
}
