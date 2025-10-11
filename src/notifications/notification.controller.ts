import { Controller, Get, Post, Body, Param, Patch, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationService, CreateReminderDto } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @UseGuards(JwtAuthGuard)
  @Post('reminders')
  @ApiOperation({
    summary: 'Criar lembrete',
    description: 'Cria um novo lembrete para o usuário'
  })
  @ApiResponse({ status: 201, description: 'Lembrete criado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async createReminder(@Request() req, @Body() reminderData: CreateReminderDto) {
    return this.notificationService.createReminder(req.user.id, reminderData);
  }

  @UseGuards(JwtAuthGuard)
  @Get('reminders')
  @ApiOperation({
    summary: 'Obter lembretes do usuário',
    description: 'Retorna todos os lembretes ativos do usuário'
  })
  @ApiResponse({ status: 200, description: 'Lembretes retornados com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getUserReminders(@Request() req) {
    return this.notificationService.getUserReminders(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('in-app')
  @ApiOperation({
    summary: 'Obter notificações in-app',
    description: 'Retorna as notificações in-app do usuário'
  })
  @ApiResponse({ status: 200, description: 'Notificações retornadas com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getUserNotifications(@Request() req, @Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit) : 20;
    return this.notificationService.getUserNotifications(req.user.id, limitNumber);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('in-app/:id/read')
  @ApiOperation({
    summary: 'Marcar notificação como lida',
    description: 'Marca uma notificação in-app como lida'
  })
  @ApiResponse({ status: 200, description: 'Notificação marcada como lida' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Notificação não encontrada' })
  async markNotificationAsRead(@Request() req, @Param('id') id: string) {
    return this.notificationService.markNotificationAsRead(parseInt(id), req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('reminders/:id/deactivate')
  @ApiOperation({
    summary: 'Desativar lembrete',
    description: 'Desativa um lembrete do usuário'
  })
  @ApiResponse({ status: 200, description: 'Lembrete desativado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Lembrete não encontrado' })
  async deactivateReminder(@Request() req, @Param('id') id: string) {
    return this.notificationService.deactivateReminder(parseInt(id), req.user.id);
  }
}
