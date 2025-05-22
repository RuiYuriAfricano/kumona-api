import { Controller, Get, Put, Post, Param, Body, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { NotificationDto } from './dto/notification.dto';
import { ReadNotificationResponseDto } from './dto/read-notification.dto';
import { ReadAllNotificationsResponseDto } from './dto/read-all-notifications.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({
    summary: 'Obter notificações',
    description: 'Retorna as notificações do usuário',
  })
  @ApiResponse({
    status: 200,
    description: 'Notificações retornadas com sucesso',
    type: [NotificationDto],
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async getUserNotifications(@Request() req): Promise<NotificationDto[]> {
    return this.notificationsService.getUserNotifications(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/read')
  @ApiOperation({
    summary: 'Marcar notificação como lida',
    description: 'Marca uma notificação específica como lida',
  })
  @ApiParam({ name: 'id', description: 'ID da notificação', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Notificação marcada como lida com sucesso',
    type: ReadNotificationResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Notificação não encontrada' })
  async markNotificationAsRead(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ReadNotificationResponseDto> {
    return this.notificationsService.markNotificationAsRead(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('read-all')
  @ApiOperation({
    summary: 'Marcar todas as notificações como lidas',
    description: 'Marca todas as notificações do usuário como lidas',
  })
  @ApiResponse({
    status: 200,
    description: 'Notificações marcadas como lidas com sucesso',
    type: ReadAllNotificationsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async markAllNotificationsAsRead(
    @Request() req,
  ): Promise<ReadAllNotificationsResponseDto> {
    return this.notificationsService.markAllNotificationsAsRead(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('broadcast')
  @ApiOperation({
    summary: 'Enviar notificação para todos os usuários',
    description: 'Envia uma notificação para todos os usuários ativos do sistema',
  })
  @ApiBody({ type: CreateNotificationDto })
  @ApiResponse({
    status: 201,
    description: 'Notificação enviada com sucesso',
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async broadcastNotification(
    @Body() createNotificationDto: CreateNotificationDto,
  ): Promise<{ success: boolean; count: number }> {
    const count = await this.notificationsService.broadcastNotification(
      createNotificationDto.title,
      createNotificationDto.message,
      createNotificationDto.type,
    );

    return {
      success: true,
      count,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':userId')
  @ApiOperation({
    summary: 'Enviar notificação para um usuário específico',
    description: 'Envia uma notificação para um usuário específico',
  })
  @ApiParam({ name: 'userId', description: 'ID do usuário', type: Number })
  @ApiBody({ type: CreateNotificationDto })
  @ApiResponse({
    status: 201,
    description: 'Notificação enviada com sucesso',
    type: NotificationDto,
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async sendNotificationToUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationDto> {
    return this.notificationsService.createNotification(
      userId,
      createNotificationDto.title,
      createNotificationDto.message,
      createNotificationDto.type,
    );
  }
}
