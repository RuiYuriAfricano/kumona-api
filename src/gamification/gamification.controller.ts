import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GamificationService, ActivityData } from './gamification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('gamification')
@ApiBearerAuth()
@Controller('gamification')
export class GamificationController {
  constructor(private gamificationService: GamificationService) {}

  @UseGuards(JwtAuthGuard)
  @Post('activity')
  @ApiOperation({
    summary: 'Registrar atividade e calcular pontos',
    description: 'Registra uma atividade do usuário e calcula os pontos ganhos'
  })
  @ApiResponse({ status: 201, description: 'Atividade registrada com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async recordActivity(@Request() req, @Body() activityData: ActivityData) {
    return this.gamificationService.recordActivity(req.user.id, activityData);
  }

  @UseGuards(JwtAuthGuard)
  @Get('progress')
  @ApiOperation({
    summary: 'Obter progresso do usuário',
    description: 'Retorna o progresso completo de gamificação do usuário'
  })
  @ApiResponse({ status: 200, description: 'Progresso retornado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getUserProgress(@Request() req) {
    return this.gamificationService.getUserProgress(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('exercises')
  @ApiOperation({
    summary: 'Obter progresso dos exercícios',
    description: 'Retorna o progresso específico dos exercícios do usuário'
  })
  @ApiResponse({ status: 200, description: 'Progresso dos exercícios retornado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getExerciseProgress(@Request() req) {
    return this.gamificationService.getExerciseProgress(req.user.id);
  }
}
