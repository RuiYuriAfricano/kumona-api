import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { PersonalizedContentService } from '../ai/personalized-content.service';
import { AnalyzeImageDto } from './dto/analyze-image.dto';
import { NextSuggestionResponseDto } from './dto/next-suggestion.dto';
import { UploadImageResponseDto } from './dto/upload-image.dto';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';
import * as fs from 'fs';
import * as path from 'path';
import { Diagnosis } from '@prisma/client';

@Injectable()
export class DiagnosisService {
  private readonly logger = new Logger(DiagnosisService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private personalizedContentService: PersonalizedContentService,
  ) {}

  async analyzeImage(userId: number, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhuma imagem foi enviada');
    }

    try {
      // Verificar se o usuário existe
      const user = await this.prisma.user.findUnique({
        where: { id: userId, deleted: false },
      });

      if (!user) {
        throw new NotFoundException('Usuário não encontrado');
      }

      // Salvar a imagem temporariamente
      const tempFilePath = path.join(process.cwd(), 'temp', `${Date.now()}-${file.originalname}`);
      fs.mkdirSync(path.dirname(tempFilePath), { recursive: true });
      fs.writeFileSync(tempFilePath, file.buffer);

      this.logger.log(`Analisando imagem para o usuário ${userId}`);

      // Usar o serviço de IA para análise de imagem
      const analysisResult = await this.aiService.analyzeEyeImage(tempFilePath);

      // Remover arquivo temporário
      fs.unlinkSync(tempFilePath);

      // Gerar recomendações personalizadas usando Gemini
      const personalizedRecommendations = await this.generatePersonalizedRecommendations(
        userId,
        analysisResult
      );

      // Salvar o diagnóstico no banco de dados
      const diagnosis = await this.prisma.diagnosis.create({
        data: {
          imageUrl: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
          condition: analysisResult.condition,
          severity: analysisResult.severity,
          score: analysisResult.score,
          description: analysisResult.description,
          recommendations: personalizedRecommendations,
          userId,
        },
      });

      this.logger.log(`Diagnóstico criado com sucesso: ID ${diagnosis.id}`);
      return diagnosis;
    } catch (error) {
      this.logger.error(`Erro ao analisar imagem: ${error.message}`, error.stack);
      throw new BadRequestException(`Erro ao analisar imagem: ${error.message}`);
    }
  }

  async getDiagnosisHistory(
    userId: number,
    limit?: string | number,
    page?: string | number,
    startDate?: string,
    endDate?: string,
  ) {
    // Converter parâmetros para números com valores padrão
    const limitNum = limit ? parseInt(limit.toString(), 10) : 10;
    const pageNum = page ? parseInt(page.toString(), 10) : 1;

    const skip = (pageNum - 1) * limitNum;

    // Construir filtro de data se fornecido
    const dateFilter = {};
    if (startDate) {
      dateFilter['gte'] = new Date(startDate);
    }
    if (endDate) {
      dateFilter['lte'] = new Date(endDate);
    }

    // Construir where com filtros
    const where: any = { userId };
    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }

    // Buscar diagnósticos
    const diagnoses = await this.prisma.diagnosis.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Contar total para paginação
    const total = await this.prisma.diagnosis.count({ where });

    return {
      data: diagnoses,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getDiagnosisById(userId: number, diagnosisId: number) {
    const diagnosis = await this.prisma.diagnosis.findFirst({
      where: {
        id: diagnosisId,
        userId,
      },
    });

    if (!diagnosis) {
      throw new NotFoundException('Diagnóstico não encontrado');
    }

    return diagnosis;
  }

  async uploadImage(userId: number, file: Express.Multer.File): Promise<UploadImageResponseDto> {
    if (!file) {
      throw new BadRequestException('Nenhuma imagem foi enviada');
    }

    try {
      // Verificar se o usuário existe
      const user = await this.prisma.user.findUnique({
        where: { id: userId, deleted: false },
      });

      if (!user) {
        throw new NotFoundException('Usuário não encontrado');
      }

      // Verificar o tipo de arquivo
      if (!file.mimetype.includes('image')) {
        throw new BadRequestException('O arquivo enviado não é uma imagem válida');
      }

      // Converter a imagem para base64
      const imageUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

      this.logger.log(`Imagem enviada com sucesso para o usuário ${userId}`);
      return {
        imageUrl,
        success: true,
      };
    } catch (error) {
      this.logger.error(`Erro ao fazer upload da imagem: ${error.message}`, error.stack);
      throw new BadRequestException(`Erro ao fazer upload da imagem: ${error.message}`);
    }
  }

  async analyzeImageFromUrl(userId: number, analyzeDto: AnalyzeImageDto) {
    try {
      // Verificar se o usuário existe
      const user = await this.prisma.user.findUnique({
        where: { id: userId, deleted: false },
      });

      if (!user) {
        throw new NotFoundException('Usuário não encontrado');
      }

      // Verificar se a URL da imagem foi fornecida
      if (!analyzeDto.imageUrl) {
        throw new BadRequestException('URL da imagem não fornecida');
      }

      // Extrair a imagem da URL base64 e salvar temporariamente
      const matches = analyzeDto.imageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new BadRequestException('Formato de URL de imagem inválido');
      }

      const imageBuffer = Buffer.from(matches[2], 'base64');

      // Criar um diretório temporário para salvar a imagem
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilePath = path.join(tempDir, `${Date.now()}-image.jpg`);
      fs.writeFileSync(tempFilePath, imageBuffer);

      // Analisar a imagem com o serviço de IA
      const analysisResult = await this.aiService.analyzeEyeImage(tempFilePath);

      // Remover o arquivo temporário
      fs.unlinkSync(tempFilePath);

      // Gerar recomendações personalizadas usando Gemini
      const personalizedRecommendations = await this.generatePersonalizedRecommendations(
        userId,
        analysisResult
      );

      // Salvar o diagnóstico no banco de dados
      const diagnosis = await this.prisma.diagnosis.create({
        data: {
          imageUrl: analyzeDto.imageUrl,
          condition: analysisResult.condition,
          severity: analysisResult.severity,
          score: analysisResult.score,
          description: analysisResult.description,
          recommendations: personalizedRecommendations,
          userId,
        },
      });

      this.logger.log(`Diagnóstico criado com sucesso: ID ${diagnosis.id}`);
      return diagnosis;
    } catch (error) {
      this.logger.error(`Erro ao analisar imagem: ${error.message}`, error.stack);
      throw new BadRequestException(`Erro ao analisar imagem: ${error.message}`);
    }
  }

  async getLatestDiagnosis(userId: number): Promise<Diagnosis> {
    const diagnosis = await this.prisma.diagnosis.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!diagnosis) {
      throw new NotFoundException('Nenhum diagnóstico encontrado para este usuário');
    }

    return diagnosis;
  }

  async getNextDiagnosisSuggestion(userId: number): Promise<NextSuggestionResponseDto> {
    // Buscar o último diagnóstico do usuário
    const latestDiagnosis = await this.prisma.diagnosis.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestDiagnosis) {
      throw new NotFoundException('Nenhum diagnóstico encontrado para este usuário');
    }

    // Determinar o intervalo recomendado com base na severidade
    let daysUntilNext = 30; // Padrão: 30 dias
    let reason = '';

    switch (latestDiagnosis.severity) {
      case 'high':
        daysUntilNext = 15;
        reason = `Baseado na sua condição atual (${latestDiagnosis.condition}), recomendamos um novo diagnóstico em 15 dias para monitorar a progressão.`;
        break;
      case 'medium':
        daysUntilNext = 30;
        reason = `Baseado na sua condição atual (${latestDiagnosis.condition}), recomendamos um novo diagnóstico em 30 dias para monitorar a progressão.`;
        break;
      case 'low':
        daysUntilNext = 60;
        reason = `Baseado na sua condição atual (${latestDiagnosis.condition}), recomendamos um novo diagnóstico em 60 dias para verificação de rotina.`;
        break;
    }

    // Calcular a data sugerida para o próximo diagnóstico
    const lastDiagnosisDate = new Date(latestDiagnosis.createdAt);
    const nextSuggestedDate = new Date(lastDiagnosisDate);
    nextSuggestedDate.setDate(nextSuggestedDate.getDate() + daysUntilNext);

    return {
      lastDiagnosisDate,
      nextSuggestedDate,
      daysUntilNext,
      reason,
      severity: latestDiagnosis.severity,
    };
  }

  async validateFundoscopyImage(imageData: string): Promise<{
    isValid: boolean;
    reason: string;
    confidence: number;
  }> {
    try {
      this.logger.log('Iniciando validação de fundoscopia com Gemini');

      // Remover o prefixo data:image/...;base64, se existir
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');

      // Usar o serviço de IA para validar se é uma imagem de fundoscopia
      const validation = await this.aiService.validateFundoscopyImage(base64Data);

      this.logger.log('Validação de fundoscopia concluída', {
        isValid: validation.isValid,
        confidence: validation.confidence
      });

      return validation;
    } catch (error) {
      this.logger.error('Erro na validação de fundoscopia', error);

      // Em caso de erro, permitir prosseguir
      return {
        isValid: true,
        reason: 'Erro na validação, prosseguindo com análise',
        confidence: 0
      };
    }
  }

  /**
   * Gera recomendações personalizadas usando Gemini AI baseadas no perfil do usuário e resultado do diagnóstico
   */
  private async generatePersonalizedRecommendations(
    userId: number,
    analysisResult: any
  ): Promise<string[]> {
    try {
      this.logger.log(`Gerando recomendações personalizadas para usuário ${userId}`);

      // Buscar dados do usuário para criar perfil
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          diagnoses: {
            orderBy: { createdAt: 'desc' },
            take: 5 // Últimos 5 diagnósticos
          }
        }
      });

      if (!user) {
        this.logger.warn(`Usuário ${userId} não encontrado, usando recomendações padrão`);
        return analysisResult.recommendations || [];
      }

      // Criar perfil do usuário para o serviço de conteúdo personalizado
      const userProfile = {
        id: user.id,
        name: user.name,
        birthDate: user.birthDate,
        medicalHistory: {
          existingConditions: [], // Pode ser expandido no futuro
          familyHistory: [],
          medications: []
        },
        diagnoses: user.diagnoses.map(d => ({
          condition: d.condition,
          severity: d.severity,
          score: d.score,
          createdAt: d.createdAt
        }))
      };

      // Adicionar o diagnóstico atual ao contexto
      const currentDiagnosis = {
        condition: analysisResult.condition,
        severity: analysisResult.severity,
        score: analysisResult.score,
        date: new Date()
      };

      // Gerar recomendações personalizadas usando Gemini
      const personalizedTips = await this.personalizedContentService.generatePersonalizedTips(
        userProfile,
        5 // Gerar 5 recomendações personalizadas
      );

      // Converter tips para formato de recomendações
      const personalizedRecommendations = personalizedTips.map(tip =>
        `${tip.title}: ${tip.description}`
      );

      // Se não conseguiu gerar recomendações personalizadas, usar as padrão
      if (personalizedRecommendations.length === 0) {
        this.logger.warn(`Não foi possível gerar recomendações personalizadas para usuário ${userId}, usando padrão`);
        return analysisResult.recommendations || [];
      }

      this.logger.log(`Geradas ${personalizedRecommendations.length} recomendações personalizadas para usuário ${userId}`);
      return personalizedRecommendations;

    } catch (error) {
      this.logger.error(`Erro ao gerar recomendações personalizadas para usuário ${userId}:`, error);
      // Em caso de erro, retornar as recomendações padrão
      return analysisResult.recommendations || [];
    }
  }
}
