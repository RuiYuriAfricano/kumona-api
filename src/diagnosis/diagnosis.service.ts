import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import * as fs from 'fs';
import * as path from 'path';

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

  // Método removido - agora usamos o AiService
}
