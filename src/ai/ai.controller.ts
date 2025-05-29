import { Controller, Post, Get, UseGuards, Request, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DailyContentService } from './daily-content.service';
import { PersonalizedContentService } from './personalized-content.service';
import { OpenAIService } from './openai.service';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(
    private dailyContentService: DailyContentService,
    private personalizedContentService: PersonalizedContentService,
    private openaiService: OpenAIService
  ) {}

  @Post('generate-daily-content')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Gerar conteúdo diário manualmente para o usuário atual',
    description: 'Endpoint para testar a geração de dicas e exercícios personalizados'
  })
  @ApiResponse({ status: 201, description: 'Conteúdo gerado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async generateDailyContentForCurrentUser(@Request() req) {
    return this.dailyContentService.generateContentManually(req.user.id);
  }

  @Post('generate-daily-content/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Gerar conteúdo diário manualmente para um usuário específico',
    description: 'Endpoint administrativo para gerar conteúdo para qualquer usuário'
  })
  @ApiResponse({ status: 201, description: 'Conteúdo gerado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async generateDailyContentForUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.dailyContentService.generateContentManually(userId);
  }

  @Post('force-regenerate-all')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Forçar regeneração de todo o conteúdo',
    description: 'Endpoint administrativo para regenerar conteúdo de todos os usuários'
  })
  @ApiResponse({ status: 201, description: 'Conteúdo regenerado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async forceRegenerateAllContent() {
    return this.dailyContentService.forceRegenerateAllContent();
  }

  @Get('content-stats')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Obter estatísticas do conteúdo gerado',
    description: 'Retorna estatísticas sobre dicas e exercícios gerados'
  })
  @ApiResponse({ status: 200, description: 'Estatísticas retornadas com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getContentStats() {
    return this.dailyContentService.getContentStats();
  }

  @Get('user/daily-tips')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Obter dicas diárias do usuário atual',
    description: 'Retorna as dicas personalizadas ativas para o usuário'
  })
  @ApiResponse({ status: 200, description: 'Dicas retornadas com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getUserDailyTips(@Request() req) {
    return this.personalizedContentService.getDailyTips(req.user.id);
  }

  @Get('user/daily-exercises')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Obter exercícios diários do usuário atual',
    description: 'Retorna os exercícios personalizados ativos para o usuário'
  })
  @ApiResponse({ status: 200, description: 'Exercícios retornados com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getUserDailyExercises(@Request() req) {
    return this.personalizedContentService.getDailyExercises(req.user.id);
  }

  @Post('user/generate-tips')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Gerar novas dicas para o usuário atual',
    description: 'Força a geração de novas dicas personalizadas'
  })
  @ApiResponse({ status: 201, description: 'Dicas geradas com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async generateUserTips(@Request() req) {
    try {
      await this.personalizedContentService.generateDailyTips(req.user.id);
      const newTips = await this.personalizedContentService.getDailyTips(req.user.id);

      return {
        success: true,
        message: `${newTips.length} dicas geradas com sucesso`,
        tips: newTips
      };
    } catch (error) {
      return {
        success: false,
        message: `Erro ao gerar dicas: ${error.message}`
      };
    }
  }

  @Post('user/generate-exercises')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Gerar novos exercícios para o usuário atual',
    description: 'Força a geração de novos exercícios personalizados'
  })
  @ApiResponse({ status: 201, description: 'Exercícios gerados com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async generateUserExercises(@Request() req) {
    try {
      await this.personalizedContentService.generateDailyExercises(req.user.id);
      const newExercises = await this.personalizedContentService.getDailyExercises(req.user.id);

      return {
        success: true,
        message: `${newExercises.length} exercícios gerados com sucesso`,
        exercises: newExercises
      };
    } catch (error) {
      return {
        success: false,
        message: `Erro ao gerar exercícios: ${error.message}`
      };
    }
  }

  @Get('openai/test-connection')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Testar conexão com OpenAI',
    description: 'Verifica se a API do OpenAI está funcionando corretamente'
  })
  @ApiResponse({ status: 200, description: 'Status da conexão retornado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async testOpenAIConnection() {
    return this.openaiService.testConnection();
  }

  @Get('openai/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Verificar status do OpenAI',
    description: 'Retorna se o serviço OpenAI está disponível'
  })
  @ApiResponse({ status: 200, description: 'Status retornado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getOpenAIStatus() {
    return {
      available: this.openaiService.isAvailable(),
      message: this.openaiService.isAvailable()
        ? 'OpenAI service is available'
        : 'OpenAI service is not configured'
    };
  }
}
