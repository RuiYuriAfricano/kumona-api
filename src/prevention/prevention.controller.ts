import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
  Type
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
import { PreventionActivityDto } from './dto/prevention-activity.dto';
import { PreventionTipDto } from './dto/prevention-tip.dto';

import { PaginatedResponseDto } from '../common/dto/pagination.dto';

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
  @ApiResponse({
    status: 200,
    description: 'Dicas de prevenção retornadas com sucesso',
    type: [PreventionTipDto]
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getPreventionTips(
    @Request() req,
    @Query('category') category?: string,
    @Query('limit') limitStr?: string,
  ): Promise<PreventionTipDto[]> {
    // Converter limit para number se fornecido
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;
    return this.preventionService.getPreventionTips(req.user.id, category, limit);
  }



  @Get('tips/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Buscar dica de prevenção por ID' })
  @ApiResponse({ status: 200, description: 'Dica encontrada', type: PreventionTipDto })
  @ApiResponse({ status: 404, description: 'Dica não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getPreventionTipById(@Param('id') id: string): Promise<PreventionTipDto> {
    return this.preventionService.getPreventionTipById(parseInt(id, 10));
  }



  @UseGuards(JwtAuthGuard)
  @Post('track')
  @ApiOperation({
    summary: 'Registrar atividade de prevenção',
    description: 'Registra uma atividade de prevenção realizada pelo usuário'
  })
  @ApiBody({ type: CreatePreventionActivityDto, description: 'Dados da atividade de prevenção' })
  @ApiResponse({
    status: 201,
    description: 'Atividade registrada com sucesso',
    type: PreventionActivityDto
  })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async trackPreventionActivity(
    @Request() req,
    @Body() createActivityDto: CreatePreventionActivityDto,
  ): Promise<PreventionActivityDto> {
    return this.preventionService.trackPreventionActivity(
      req.user.id,
      createActivityDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('activities')
  @ApiOperation({
    summary: 'Obter atividades do usuário',
    description: 'Retorna o histórico de atividades de prevenção do usuário'
  })
  @ApiQuery({ name: 'page', required: false, description: 'Número da página', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Itens por página', type: Number })
  @ApiQuery({ name: 'startDate', required: false, description: 'Data inicial (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Data final (YYYY-MM-DD)' })
  @ApiResponse({
    status: 200,
    description: 'Atividades retornadas com sucesso',
    type: PaginatedResponseDto
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async getPreventionActivities(
    @Request() req,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<PaginatedResponseDto<PreventionActivityDto>> {
    // Converter page e limit para number se fornecidos
    const page = pageStr ? parseInt(pageStr, 10) : undefined;
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;

    return this.preventionService.getPreventionActivities(
      req.user.id,
      page,
      limit,
      startDate,
      endDate,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('activities/stats')
  @ApiOperation({
    summary: 'Obter estatísticas de atividades do usuário',
    description: 'Retorna estatísticas das atividades de prevenção do usuário'
  })
  @ApiResponse({ status: 200, description: 'Estatísticas retornadas com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async getUserActivities(@Request() req) {
    return this.preventionService.getUserActivities(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('debug/user-status')
  @ApiOperation({
    summary: 'Debug: Verificar status do usuário',
    description: 'Endpoint temporário para verificar quantos diagnósticos o usuário tem'
  })
  async debugUserStatus(@Request() req) {
    return this.preventionService.debugUserStatus(req.user.id);
  }

  @Get('user/tips')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Buscar dicas de prevenção do usuário' })
  @ApiResponse({ status: 200, description: 'Dicas do usuário encontradas', type: [PreventionTipDto] })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getUserPreventionTips(@Request() req): Promise<PreventionTipDto[]> {
    return this.preventionService.getUserPreventionTips(req.user.id);
  }

  @Get('user/tips/checksum')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obter checksum das dicas do usuário para verificar mudanças' })
  @ApiResponse({ status: 200, description: 'Checksum das dicas' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getUserTipsChecksum(@Request() req) {
    const tips = await this.preventionService.getUserPreventionTips(req.user.id);
    const tipIds = tips.map(tip => tip.id).sort();
    const checksum = Buffer.from(JSON.stringify(tipIds)).toString('base64');

    return {
      checksum,
      count: tips.length,
      tipIds,
      timestamp: new Date().toISOString()
    };
  }



  @Get('user/saved-tips')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Buscar dicas salvas do usuário' })
  @ApiResponse({ status: 200, description: 'Dicas salvas do usuário encontradas' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getUserSavedTips(@Request() req) {
    return this.preventionService.getUserSavedTips(req.user.id);
  }

  @Post('user/save-tip')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Salvar uma dica como favorita' })
  @ApiResponse({ status: 201, description: 'Dica salva com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async saveTip(@Request() req, @Body() body: { tipId: number; tipType: 'general' | 'personal' }) {
    try {
      console.log('🔍 [Controller] saveTip chamado:', {
        userId: req.user?.id,
        tipId: body.tipId,
        tipType: body.tipType,
        bodyKeys: Object.keys(body),
        userKeys: Object.keys(req.user || {})
      });

      if (!req.user?.id) {
        throw new Error('Usuário não encontrado na requisição');
      }

      if (!body.tipId) {
        throw new Error('tipId é obrigatório');
      }

      if (!body.tipType) {
        throw new Error('tipType é obrigatório');
      }

      const result = await this.preventionService.saveTip(req.user.id, body.tipId, body.tipType);
      console.log('✅ [Controller] saveTip sucesso:', result);
      return result;
    } catch (error) {
      console.error('❌ [Controller] Erro em saveTip:', {
        message: error.message,
        stack: error.stack,
        userId: req.user?.id,
        body: body
      });
      throw error;
    }
  }

  @Delete('user/unsave-tip')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remover uma dica dos salvos' })
  @ApiResponse({ status: 200, description: 'Dica removida dos salvos com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async unsaveTip(@Request() req, @Body() body: { tipId: number; tipType: 'general' | 'personal' }) {
    return this.preventionService.unsaveTip(req.user.id, body.tipId, body.tipType);
  }


}
