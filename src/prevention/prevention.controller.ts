import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  ParseIntPipe
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PreventionService } from './prevention.service';
import { CreatePreventionActivityDto } from './dto/create-prevention-activity.dto';

@ApiTags('prevention')
@ApiBearerAuth()
@Controller('prevention')
export class PreventionController {
  constructor(private preventionService: PreventionService) {}

  @UseGuards(JwtAuthGuard)
  @Get('tips')
  @ApiOperation({
    summary: 'Obter dicas de prevenção',
    description: 'Retorna uma lista de dicas de prevenção ocular, opcionalmente filtradas por categoria'
  })
  @ApiQuery({ name: 'category', required: false, description: 'Categoria das dicas (ex: "Uso de telas", "Saúde geral", "Proteção")' })
  @ApiQuery({ name: 'limit', required: false, description: 'Número máximo de dicas a retornar', type: Number })
  @ApiResponse({ status: 200, description: 'Dicas de prevenção retornadas com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getPreventionTips(
    @Query('category') category?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.preventionService.getPreventionTips(category, limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get('exercises')
  @ApiOperation({
    summary: 'Obter exercícios oculares',
    description: 'Retorna uma lista de exercícios oculares recomendados'
  })
  @ApiResponse({ status: 200, description: 'Exercícios oculares retornados com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getEyeExercises() {
    return this.preventionService.getEyeExercises();
  }

  @UseGuards(JwtAuthGuard)
  @Post('track')
  @ApiOperation({
    summary: 'Registrar atividade de prevenção',
    description: 'Registra uma atividade de prevenção realizada pelo usuário'
  })
  @ApiBody({ type: CreatePreventionActivityDto, description: 'Dados da atividade de prevenção' })
  @ApiResponse({ status: 201, description: 'Atividade registrada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async trackPreventionActivity(
    @Request() req,
    @Body() createActivityDto: CreatePreventionActivityDto,
  ) {
    return this.preventionService.trackPreventionActivity(
      req.user.id,
      createActivityDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('activities')
  @ApiOperation({
    summary: 'Obter atividades do usuário',
    description: 'Retorna o histórico de atividades de prevenção do usuário com estatísticas'
  })
  @ApiResponse({ status: 200, description: 'Atividades retornadas com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async getUserActivities(@Request() req) {
    return this.preventionService.getUserActivities(req.user.id);
  }
}
