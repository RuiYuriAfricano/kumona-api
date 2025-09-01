import { Controller, Post, Get, Delete, UseGuards, Request, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DailyContentService } from './daily-content.service';
import { PersonalizedContentService } from './personalized-content.service';
import { OpenAIService, UserProfile } from './openai.service';
import { GeminiService } from './gemini.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(
    private dailyContentService: DailyContentService,
    private personalizedContentService: PersonalizedContentService,
    private openaiService: OpenAIService,
    private geminiService: GeminiService,
    private prisma: PrismaService
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

  @Get('gemini/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Verificar status do Gemini',
    description: 'Retorna se o serviço Gemini está disponível'
  })
  @ApiResponse({ status: 200, description: 'Status retornado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getGeminiStatus() {
    return {
      available: this.geminiService.isAvailable(),
      message: this.geminiService.isAvailable()
        ? 'Gemini service is available'
        : 'Gemini service is not configured'
    };
  }

  // ========== ROTAS DESPROTEGIDAS PARA TESTE ==========

  @Get('test/status')
  @ApiOperation({
    summary: '[TESTE] Verificar status dos serviços de IA (sem autenticação)',
    description: 'Endpoint público para testar se os serviços de IA estão funcionando'
  })
  @ApiResponse({ status: 200, description: 'Status retornado' })
  async testAIServicesStatusPublic() {
    return {
      services: {
        gemini: {
          available: this.geminiService.isAvailable(),
          message: this.geminiService.isAvailable()
            ? 'Gemini service is available and ready for testing'
            : 'Gemini service is not configured'
        },
        openai: {
          available: this.openaiService.isAvailable(),
          message: this.openaiService.isAvailable()
            ? 'OpenAI service is available and ready for testing'
            : 'OpenAI service is not configured'
        }
      },
      priority: 'Gemini > OpenAI > Fallback',
      timestamp: new Date().toISOString()
    };
  }

  @Get('test/connection')
  @ApiOperation({
    summary: '[TESTE] Testar conexão com OpenAI (sem autenticação)',
    description: 'Endpoint público para testar a conectividade com OpenAI'
  })
  @ApiResponse({ status: 200, description: 'Resultado do teste de conexão' })
  async testOpenAIConnectionPublic() {
    try {
      const result = await this.openaiService.testConnection();
      return {
        ...result,
        timestamp: new Date().toISOString(),
        note: 'This is a public test endpoint'
      };
    } catch (error) {
      return {
        success: false,
        message: `Test failed: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Post('test/generate-sample-tips')
  @ApiOperation({
    summary: '[TESTE] Gerar dicas de exemplo (sem autenticação)',
    description: 'Endpoint público para testar geração de dicas com dados de exemplo'
  })
  @ApiResponse({ status: 200, description: 'Dicas de exemplo geradas' })
  async generateSampleTips(): Promise<any> {
    try {
      // Criar perfil de usuário de exemplo
      const sampleUserProfile = {
        id: '999',
        name: 'João Silva',
        email: 'joao.silva@demo.com',
        birthDate: new Date('1990-05-15'),
        medicalHistory: {
          existingConditions: ['Miopia leve'],
          familyHistory: ['Glaucoma (avô paterno)'],
          medications: []
        },
        diagnoses: [
          {
            condition: 'Fadiga ocular digital',
            severity: 'medium',
            date: new Date()
          }
        ]
      };

      // Tentar Gemini primeiro
      if (this.geminiService.isAvailable()) {
        const aiTips = await this.geminiService.generatePersonalizedTips(sampleUserProfile, 5);
        return {
          success: true,
          method: 'Google Gemini 1.5 Flash',
          userProfile: {
            name: sampleUserProfile.name,
            age: new Date().getFullYear() - sampleUserProfile.birthDate.getFullYear(),
            conditions: sampleUserProfile.medicalHistory.existingConditions,
            recentDiagnosis: sampleUserProfile.diagnoses[0].condition
          },
          tips: aiTips,
          timestamp: new Date().toISOString()
        };
      } else if (this.openaiService.isAvailable()) {
        // Converter perfil para OpenAI (que espera id como number e createdAt)
        const openaiProfile = {
          ...sampleUserProfile,
          id: parseInt(sampleUserProfile.id),
          diagnoses: sampleUserProfile.diagnoses.map(d => ({
            condition: d.condition,
            severity: d.severity,
            score: 65, // Score padrão para teste
            createdAt: d.date
          }))
        };
        const aiTips = await this.openaiService.generatePersonalizedTips(openaiProfile, 5);
        return {
          success: true,
          method: 'OpenAI GPT-3.5-turbo',
          userProfile: {
            name: sampleUserProfile.name,
            age: new Date().getFullYear() - sampleUserProfile.birthDate.getFullYear(),
            conditions: sampleUserProfile.medicalHistory.existingConditions,
            recentDiagnosis: sampleUserProfile.diagnoses[0].condition
          },
          tips: aiTips,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          method: 'Fallback (No AI services available)',
          message: 'Neither Gemini nor OpenAI services are configured, would use fallback logic',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Post('test/generate-sample-exercises')
  @ApiOperation({
    summary: '[TESTE] Gerar exercícios de exemplo (sem autenticação)',
    description: 'Endpoint público para testar geração de exercícios com dados de exemplo'
  })
  @ApiResponse({ status: 200, description: 'Exercícios de exemplo gerados' })
  async generateSampleExercises(): Promise<any> {
    try {
      // Criar perfil de usuário de exemplo
      const sampleUserProfile = {
        id: '999',
        name: 'Maria Santos',
        email: 'maria.santos@demo.com',
        birthDate: new Date('1985-08-20'),
        medicalHistory: {
          existingConditions: ['Olho seco'],
          familyHistory: [],
          medications: ['Colírio lubrificante']
        },
        diagnoses: [
          {
            condition: 'Síndrome do olho seco',
            severity: 'low',
            date: new Date()
          }
        ]
      };

      // Tentar Gemini primeiro
      if (this.geminiService.isAvailable()) {
        const aiExercises = await this.geminiService.generatePersonalizedExercises(sampleUserProfile, 3);
        return {
          success: true,
          method: 'Google Gemini 1.5 Flash',
          userProfile: {
            name: sampleUserProfile.name,
            age: new Date().getFullYear() - sampleUserProfile.birthDate.getFullYear(),
            conditions: sampleUserProfile.medicalHistory.existingConditions,
            recentDiagnosis: sampleUserProfile.diagnoses[0].condition
          },
          exercises: aiExercises,
          timestamp: new Date().toISOString()
        };
      } else if (this.openaiService.isAvailable()) {
        // Converter perfil para OpenAI (que espera id como number e createdAt)
        const openaiProfile = {
          ...sampleUserProfile,
          id: parseInt(sampleUserProfile.id),
          diagnoses: sampleUserProfile.diagnoses.map(d => ({
            condition: d.condition,
            severity: d.severity,
            score: 45, // Score padrão para teste
            createdAt: d.date
          }))
        };
        const aiExercises = await this.openaiService.generatePersonalizedExercises(openaiProfile, 3);
        return {
          success: true,
          method: 'OpenAI GPT-3.5-turbo',
          userProfile: {
            name: sampleUserProfile.name,
            age: new Date().getFullYear() - sampleUserProfile.birthDate.getFullYear(),
            conditions: sampleUserProfile.medicalHistory.existingConditions,
            recentDiagnosis: sampleUserProfile.diagnoses[0].condition
          },
          exercises: aiExercises,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          method: 'Fallback (No AI services available)',
          message: 'Neither Gemini nor OpenAI services are configured, would use fallback logic',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Post('test/gemini/generate-tips')
  @ApiOperation({
    summary: '[TESTE] Gerar dicas usando apenas Gemini (sem autenticação)',
    description: 'Endpoint público para testar geração de dicas especificamente com Gemini'
  })
  @ApiResponse({ status: 200, description: 'Dicas geradas com Gemini' })
  async generateGeminiTips(): Promise<any> {
    try {
      const sampleUserProfile = {
        id: '999',
        name: 'Ana Costa',
        email: 'ana.costa@demo.com',
        birthDate: new Date('1992-03-10'),
        medicalHistory: {
          existingConditions: ['Astigmatismo', 'Fadiga ocular'],
          familyHistory: ['Miopia (mãe)'],
          medications: []
        },
        diagnoses: [
          {
            condition: 'Síndrome da visão computacional',
            severity: 'medium',
            date: new Date()
          }
        ]
      };

      if (this.geminiService.isAvailable()) {
        const geminiTips = await this.geminiService.generatePersonalizedTips(sampleUserProfile, 5);
        return {
          success: true,
          method: 'Google Gemini 1.5 Flash',
          userProfile: {
            name: sampleUserProfile.name,
            age: new Date().getFullYear() - sampleUserProfile.birthDate.getFullYear(),
            conditions: sampleUserProfile.medicalHistory.existingConditions,
            recentDiagnosis: sampleUserProfile.diagnoses[0].condition
          },
          tips: geminiTips,
          timestamp: new Date().toISOString(),
          note: 'Generated exclusively with Gemini AI'
        };
      } else {
        return {
          success: false,
          method: 'Gemini not available',
          message: 'Gemini service is not configured. Please set GEMINI_API_KEY environment variable.',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Post('test/gemini/generate-exercises')
  @ApiOperation({
    summary: '[TESTE] Gerar exercícios usando apenas Gemini (sem autenticação)',
    description: 'Endpoint público para testar geração de exercícios especificamente com Gemini'
  })
  @ApiResponse({ status: 200, description: 'Exercícios gerados com Gemini' })
  async generateGeminiExercises(): Promise<any> {
    try {
      const sampleUserProfile = {
        id: '999',
        name: 'Carlos Oliveira',
        email: 'carlos.oliveira@demo.com',
        birthDate: new Date('1988-11-25'),
        medicalHistory: {
          existingConditions: ['Presbiopia inicial'],
          familyHistory: ['Glaucoma (pai)'],
          medications: ['Óculos de leitura']
        },
        diagnoses: [
          {
            condition: 'Presbiopia',
            severity: 'low',
            date: new Date()
          }
        ]
      };

      if (this.geminiService.isAvailable()) {
        const geminiExercises = await this.geminiService.generatePersonalizedExercises(sampleUserProfile, 3);
        return {
          success: true,
          method: 'Google Gemini 1.5 Flash',
          userProfile: {
            name: sampleUserProfile.name,
            age: new Date().getFullYear() - sampleUserProfile.birthDate.getFullYear(),
            conditions: sampleUserProfile.medicalHistory.existingConditions,
            recentDiagnosis: sampleUserProfile.diagnoses[0].condition
          },
          exercises: geminiExercises,
          timestamp: new Date().toISOString(),
          note: 'Generated exclusively with Gemini AI'
        };
      } else {
        return {
          success: false,
          method: 'Gemini not available',
          message: 'Gemini service is not configured. Please set GEMINI_API_KEY environment variable.',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Post('test/seed-ai-content')
  @ApiOperation({
    summary: '[TESTE] Gerar conteúdo IA para todos os usuários (seed)',
    description: 'Endpoint para popular o banco com conteúdo gerado por IA para todos os usuários com diagnósticos'
  })
  @ApiResponse({ status: 200, description: 'Conteúdo gerado para todos os usuários' })
  async seedAIContent(): Promise<any> {
    try {
      const result = await this.dailyContentService.generateDailyContentForAllUsers();

      // Obter estatísticas após a geração
      const stats = await this.dailyContentService.getContentStats();

      return {
        success: true,
        message: 'Conteúdo IA gerado para todos os usuários com diagnósticos',
        stats,
        timestamp: new Date().toISOString(),
        note: 'Este endpoint popula o banco com dicas e exercícios personalizados'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Post('test/seed-user-content/:userId')
  @ApiOperation({
    summary: '[TESTE] Gerar conteúdo IA para usuário específico',
    description: 'Endpoint para gerar conteúdo personalizado para um usuário específico'
  })
  @ApiResponse({ status: 200, description: 'Conteúdo gerado para o usuário' })
  async seedUserContent(@Param('userId', ParseIntPipe) userId: number): Promise<any> {
    try {
      // Gerar conteúdo para o usuário específico
      const result = await this.dailyContentService.generateContentManually(userId);

      if (result.success) {
        // Buscar o conteúdo gerado
        const [tips, exercises] = await Promise.all([
          this.personalizedContentService.getDailyTips(userId),
          this.personalizedContentService.getDailyExercises(userId)
        ]);

        return {
          success: true,
          message: `Conteúdo IA gerado para usuário ${userId}`,
          userId,
          content: {
            tips: tips.length,
            exercises: exercises.length,
            generatedTips: tips,
            generatedExercises: exercises
          },
          timestamp: new Date().toISOString()
        };
      } else {
        return result;
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        userId,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Get('test/user-content/:userId')
  @ApiOperation({
    summary: '[TESTE] Ver conteúdo IA do usuário',
    description: 'Endpoint para visualizar o conteúdo personalizado de um usuário'
  })
  @ApiResponse({ status: 200, description: 'Conteúdo do usuário retornado' })
  async getUserContent(@Param('userId', ParseIntPipe) userId: number): Promise<any> {
    try {
      const [tips, exercises, savedTips] = await Promise.all([
        this.personalizedContentService.getDailyTips(userId),
        this.personalizedContentService.getDailyExercises(userId),
        this.personalizedContentService.getSavedTips(userId)
      ]);

      return {
        success: true,
        userId,
        content: {
          dailyTips: {
            count: tips.length,
            tips: tips
          },
          dailyExercises: {
            count: exercises.length,
            exercises: exercises
          },
          savedTips: {
            count: savedTips.totalSaved,
            savedTipIds: savedTips.savedTipIds
          }
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        userId,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Delete('test/clear-ai-content')
  @ApiOperation({
    summary: '[TESTE] Limpar todo conteúdo IA',
    description: 'Endpoint para limpar todo o conteúdo gerado por IA (reset)'
  })
  @ApiResponse({ status: 200, description: 'Conteúdo IA limpo' })
  async clearAIContent(): Promise<any> {
    try {
      // Usar o serviço do Prisma diretamente para limpar
      const [deletedTips, deletedExercises, deletedSavedTips] = await Promise.all([
        this.personalizedContentService['prisma'].userTip.deleteMany({}),
        this.personalizedContentService['prisma'].userExercise.deleteMany({}),
        this.personalizedContentService['prisma'].savedTip.deleteMany({})
      ]);

      return {
        success: true,
        message: 'Todo conteúdo IA foi limpo do banco de dados',
        deleted: {
          tips: deletedTips.count,
          exercises: deletedExercises.count,
          savedTips: deletedSavedTips.count
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Get('test/demo-users')
  @ApiOperation({
    summary: '[TESTE] Listar usuários de demonstração',
    description: 'Retorna lista de usuários estáticos para teste da IA'
  })
  @ApiResponse({ status: 200, description: 'Lista de usuários de demonstração' })
  async getDemoUsers(): Promise<any> {
    const demoUsers = [
      {
        id: 1001,
        name: 'João Silva',
        age: 34,
        birthDate: new Date('1990-05-15'),
        email: 'joao.silva@demo.com',
        medicalHistory: {
          existingConditions: ['Miopia leve', 'Astigmatismo'],
          familyHistory: ['Glaucoma (avô paterno)', 'Catarata (avó materna)'],
          medications: ['Colírio lubrificante']
        },
        diagnoses: [
          {
            condition: 'Fadiga ocular digital',
            severity: 'medium',
            score: 65,
            createdAt: new Date('2024-05-20')
          },
          {
            condition: 'Olho seco leve',
            severity: 'low',
            score: 35,
            createdAt: new Date('2024-05-10')
          }
        ]
      },
      {
        id: 1002,
        name: 'Maria Santos',
        age: 28,
        birthDate: new Date('1996-08-20'),
        email: 'maria.santos@demo.com',
        medicalHistory: {
          existingConditions: ['Síndrome do olho seco'],
          familyHistory: [],
          medications: ['Lágrimas artificiais', 'Ômega 3']
        },
        diagnoses: [
          {
            condition: 'Síndrome do olho seco moderada',
            severity: 'medium',
            score: 55,
            createdAt: new Date('2024-05-25')
          }
        ]
      },
      {
        id: 1003,
        name: 'Carlos Mendes',
        age: 45,
        birthDate: new Date('1979-12-03'),
        email: 'carlos.mendes@demo.com',
        medicalHistory: {
          existingConditions: ['Hipertensão', 'Diabetes tipo 2'],
          familyHistory: ['Retinopatia diabética (pai)', 'Glaucoma (mãe)'],
          medications: ['Metformina', 'Losartana', 'Colírio anti-glaucoma']
        },
        diagnoses: [
          {
            condition: 'Retinopatia diabética inicial',
            severity: 'high',
            score: 78,
            createdAt: new Date('2024-05-15')
          },
          {
            condition: 'Pressão intraocular elevada',
            severity: 'medium',
            score: 62,
            createdAt: new Date('2024-05-18')
          }
        ]
      },
      {
        id: 1004,
        name: 'Ana Costa',
        age: 22,
        birthDate: new Date('2002-03-10'),
        email: 'ana.costa@demo.com',
        medicalHistory: {
          existingConditions: [],
          familyHistory: ['Miopia (ambos os pais)'],
          medications: []
        },
        diagnoses: [
          {
            condition: 'Miopia progressiva',
            severity: 'low',
            score: 42,
            createdAt: new Date('2024-05-22')
          }
        ]
      }
    ];

    return {
      success: true,
      message: 'Usuários de demonstração para teste da IA',
      users: demoUsers,
      count: demoUsers.length,
      timestamp: new Date().toISOString(),
      note: 'Estes são usuários estáticos criados para demonstrar a personalização da IA'
    };
  }

  @Post('test/generate-for-demo-user/:demoUserId')
  @ApiOperation({
    summary: '[TESTE] Gerar conteúdo IA para usuário de demonstração',
    description: 'Gera dicas e exercícios personalizados para um usuário de demonstração específico'
  })
  @ApiResponse({ status: 200, description: 'Conteúdo gerado para usuário de demonstração' })
  async generateForDemoUser(@Param('demoUserId', ParseIntPipe) demoUserId: number): Promise<any> {
    try {
      // Definir usuários de demonstração
      const demoUsers = {
        1001: {
          id: 1001,
          name: 'João Silva',
          birthDate: new Date('1990-05-15'),
          medicalHistory: {
            existingConditions: ['Miopia leve', 'Astigmatismo'],
            familyHistory: ['Glaucoma (avô paterno)', 'Catarata (avó materna)'],
            medications: ['Colírio lubrificante']
          },
          diagnoses: [
            {
              condition: 'Fadiga ocular digital',
              severity: 'medium',
              score: 65,
              createdAt: new Date('2024-05-20')
            }
          ]
        },
        1002: {
          id: 1002,
          name: 'Maria Santos',
          birthDate: new Date('1996-08-20'),
          medicalHistory: {
            existingConditions: ['Síndrome do olho seco'],
            familyHistory: [],
            medications: ['Lágrimas artificiais', 'Ômega 3']
          },
          diagnoses: [
            {
              condition: 'Síndrome do olho seco moderada',
              severity: 'medium',
              score: 55,
              createdAt: new Date('2024-05-25')
            }
          ]
        },
        1003: {
          id: 1003,
          name: 'Carlos Mendes',
          birthDate: new Date('1979-12-03'),
          medicalHistory: {
            existingConditions: ['Hipertensão', 'Diabetes tipo 2'],
            familyHistory: ['Retinopatia diabética (pai)', 'Glaucoma (mãe)'],
            medications: ['Metformina', 'Losartana', 'Colírio anti-glaucoma']
          },
          diagnoses: [
            {
              condition: 'Retinopatia diabética inicial',
              severity: 'high',
              score: 78,
              createdAt: new Date('2024-05-15')
            }
          ]
        },
        1004: {
          id: 1004,
          name: 'Ana Costa',
          birthDate: new Date('2002-03-10'),
          medicalHistory: {
            existingConditions: [],
            familyHistory: ['Miopia (ambos os pais)'],
            medications: []
          },
          diagnoses: [
            {
              condition: 'Miopia progressiva',
              severity: 'low',
              score: 42,
              createdAt: new Date('2024-05-22')
            }
          ]
        }
      };

      const demoUser = demoUsers[demoUserId];
      if (!demoUser) {
        return {
          success: false,
          error: `Usuário de demonstração ${demoUserId} não encontrado`,
          availableUsers: Object.keys(demoUsers).map(Number),
          timestamp: new Date().toISOString()
        };
      }

      // Gerar dicas e exercícios usando IA
      const [aiTips, aiExercises] = await Promise.all([
        this.openaiService.isAvailable()
          ? this.openaiService.generatePersonalizedTips(demoUser, 10)
          : [],
        this.openaiService.isAvailable()
          ? this.openaiService.generatePersonalizedExercises(demoUser, 3)
          : []
      ]);

      const age = new Date().getFullYear() - demoUser.birthDate.getFullYear();

      return {
        success: true,
        message: `Conteúdo IA gerado para ${demoUser.name}`,
        demoUser: {
          id: demoUser.id,
          name: demoUser.name,
          age,
          conditions: demoUser.medicalHistory.existingConditions,
          familyHistory: demoUser.medicalHistory.familyHistory,
          medications: demoUser.medicalHistory.medications,
          recentDiagnosis: demoUser.diagnoses[0]?.condition
        },
        generatedContent: {
          tips: {
            count: aiTips.length,
            method: this.openaiService.isAvailable() ? 'OpenAI GPT-3.5-turbo' : 'Fallback',
            content: aiTips
          },
          exercises: {
            count: aiExercises.length,
            method: this.openaiService.isAvailable() ? 'OpenAI GPT-3.5-turbo' : 'Fallback',
            content: aiExercises
          }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        demoUserId,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Post('test/generate-all-demo-users')
  @ApiOperation({
    summary: '[TESTE] Gerar conteúdo IA para todos os usuários de demonstração',
    description: 'Gera dicas e exercícios personalizados para todos os usuários de demonstração'
  })
  @ApiResponse({ status: 200, description: 'Conteúdo gerado para todos os usuários de demonstração' })
  async generateForAllDemoUsers(): Promise<any> {
    try {
      const demoUserIds = [1001, 1002, 1003, 1004];
      const results = [];

      for (const userId of demoUserIds) {
        try {
          const result = await this.generateForDemoUser(userId);
          results.push({
            userId,
            success: result.success,
            userName: result.demoUser?.name || 'Unknown',
            tipsGenerated: result.generatedContent?.tips?.count || 0,
            exercisesGenerated: result.generatedContent?.exercises?.count || 0,
            error: result.error || null
          });
        } catch (error) {
          results.push({
            userId,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const totalTips = results.reduce((sum, r) => sum + (r.tipsGenerated || 0), 0);
      const totalExercises = results.reduce((sum, r) => sum + (r.exercisesGenerated || 0), 0);

      return {
        success: true,
        message: `Conteúdo IA gerado para ${successCount}/${demoUserIds.length} usuários de demonstração`,
        summary: {
          usersProcessed: demoUserIds.length,
          usersSuccess: successCount,
          totalTipsGenerated: totalTips,
          totalExercisesGenerated: totalExercises
        },
        results,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Get('test/classifier/status')
  @ApiOperation({
    summary: '[TESTE] Verificar status da API de classificação (sem autenticação)',
    description: 'Endpoint público para testar se a API ai-kumona-classifier está funcionando'
  })
  @ApiResponse({ status: 200, description: 'Status da API de classificação' })
  async testClassifierStatus(): Promise<any> {
    try {
      const customUrl = process.env.AI_CUSTOM_URL;

      if (!customUrl) {
        return {
          success: false,
          message: 'URL da API de classificação não configurada',
          config: {
            AI_CUSTOM_URL: 'não configurado',
            expected: 'http://localhost:8000'
          },
          timestamp: new Date().toISOString()
        };
      }

      // Testar endpoint de health da API de classificação
      const axios = require('axios');
      const healthResponse = await axios.get(`${customUrl}/health`, { timeout: 10000 });

      return {
        success: true,
        message: 'API de classificação está funcionando',
        classifierUrl: customUrl,
        healthStatus: healthResponse.data,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        message: `Erro ao conectar com API de classificação: ${error.message}`,
        classifierUrl: process.env.AI_CUSTOM_URL,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Get('test/classifier/classes')
  @ApiOperation({
    summary: '[TESTE] Obter classes disponíveis da API de classificação',
    description: 'Endpoint público para verificar as classes que a API de classificação pode detectar'
  })
  @ApiResponse({ status: 200, description: 'Classes disponíveis' })
  async testClassifierClasses(): Promise<any> {
    try {
      const customUrl = process.env.AI_CUSTOM_URL;

      if (!customUrl) {
        return {
          success: false,
          message: 'URL da API de classificação não configurada',
          timestamp: new Date().toISOString()
        };
      }

      const axios = require('axios');
      const classesResponse = await axios.get(`${customUrl}/classes`, { timeout: 10000 });

      return {
        success: true,
        message: 'Classes obtidas com sucesso',
        classifierUrl: customUrl,
        classes: classesResponse.data,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        message: `Erro ao obter classes: ${error.message}`,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}
