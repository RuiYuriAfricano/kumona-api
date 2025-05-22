import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProgressService } from './progress.service';
import { ProgressSummaryDto } from './dto/progress-summary.dto';
import { ProgressChartsDto } from './dto/progress-charts.dto';
import { ProgressHistoryItemDto } from './dto/progress-history.dto';

@ApiTags('progress')
@ApiBearerAuth()
@Controller('progress')
export class ProgressController {
  constructor(private progressService: ProgressService) {}

  @UseGuards(JwtAuthGuard)
  @Get('summary')
  @ApiOperation({
    summary: 'Obter resumo do progresso',
    description: 'Retorna um resumo do progresso da saúde ocular do usuário'
  })
  @ApiResponse({
    status: 200,
    description: 'Resumo do progresso retornado com sucesso',
    type: ProgressSummaryDto
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async getProgressSummary(@Request() req): Promise<ProgressSummaryDto> {
    return this.progressService.getProgressSummary(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('charts')
  @ApiOperation({
    summary: 'Obter dados para gráficos',
    description: 'Retorna dados formatados para visualização em gráficos de progresso'
  })
  @ApiResponse({
    status: 200,
    description: 'Dados para gráficos retornados com sucesso',
    type: ProgressChartsDto
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async getProgressCharts(@Request() req): Promise<ProgressChartsDto> {
    return this.progressService.getProgressCharts(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  @ApiOperation({
    summary: 'Obter histórico de progresso',
    description: 'Retorna o histórico detalhado de progresso do usuário'
  })
  @ApiResponse({
    status: 200,
    description: 'Histórico de progresso retornado com sucesso',
    type: [ProgressHistoryItemDto]
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async getProgressHistory(@Request() req): Promise<ProgressHistoryItemDto[]> {
    return this.progressService.getProgressHistory(req.user.id);
  }
}
