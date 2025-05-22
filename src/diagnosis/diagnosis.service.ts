import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
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

      // Salvar o diagnóstico no banco de dados
      const diagnosis = await this.prisma.diagnosis.create({
        data: {
          imageUrl: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
          condition: analysisResult.condition,
          severity: analysisResult.severity,
          score: analysisResult.score,
          description: analysisResult.description,
          recommendations: analysisResult.recommendations,
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
    limit = 10,
    page = 1,
    startDate?: string,
    endDate?: string,
  ) {
    const skip = (page - 1) * limit;

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
      take: limit,
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
        page,
        limit,
        totalPages: Math.ceil(total / limit),
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

      // Salvar o diagnóstico no banco de dados
      const diagnosis = await this.prisma.diagnosis.create({
        data: {
          imageUrl: analyzeDto.imageUrl,
          condition: analysisResult.condition,
          severity: analysisResult.severity,
          score: analysisResult.score,
          description: analysisResult.description,
          recommendations: analysisResult.recommendations,
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
}
