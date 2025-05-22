import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProgressService } from './progress.service';

@ApiTags('progress')
@ApiBearerAuth()
@Controller('progress')
export class ProgressController {
  constructor(private progressService: ProgressService) {}

  @UseGuards(JwtAuthGuard)
  @Get('summary')
  @ApiOperation({
    summary: 'Obter resumo do progresso',
    description: 'Retorna um resumo do progresso da saúde ocular do usuário, incluindo tendências e recomendações'
  })
  @ApiResponse({ status: 200, description: 'Resumo do progresso retornado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async getProgressSummary(@Request() req) {
    return this.progressService.getProgressSummary(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('charts')
  @ApiOperation({
    summary: 'Obter dados para gráficos',
    description: 'Retorna dados formatados para visualização em gráficos de progresso'
  })
  @ApiQuery({
    name: 'type',
    required: true,
    description: 'Tipo de gráfico (score, activities, conditions)',
    enum: ['score', 'activities', 'conditions']
  })
  @ApiQuery({
    name: 'period',
    required: false,
    description: 'Período de tempo (week, month, year)',
    enum: ['week', 'month', 'year']
  })
  @ApiResponse({ status: 200, description: 'Dados para gráficos retornados com sucesso' })
  @ApiResponse({ status: 400, description: 'Tipo de gráfico inválido' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async getChartData(
    @Request() req,
    @Query('type') type: string,
    @Query('period') period: string,
  ) {
    return this.progressService.getChartData(req.user.id, type, period);
  }
}
