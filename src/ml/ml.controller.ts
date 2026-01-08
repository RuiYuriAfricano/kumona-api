import {
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  HttpStatus,
  ForbiddenException,
  Query
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MLTrainingService } from './ml-training.service';

// Interface para dados de treinamento
interface TrainingData {
  imageUrl: string;
  correctLabel: string;
  originalPrediction: string;
  confidence: number;
  specialistConfidence: number;
}
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Machine Learning')
@Controller('ml')
export class MLController {
  constructor(
    private readonly mlTrainingService: MLTrainingService,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Verificar se o usuário é admin
   */
  private async verifyAdminRole(userId: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Acesso negado. Apenas administradores podem realizar esta ação.');
    }
  }

  @Get('corrections')
  @ApiOperation({ summary: 'Obter correções de especialistas para retreinamento (público)' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Limite de correções a retornar'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Correções retornadas com sucesso'
  })
  async getCorrections(@Query('limit') limit?: number) {
    const maxLimit = limit ? Math.min(limit, 1000) : 1000;

    // Buscar diagnósticos validados com correções
    const diagnoses = await this.prisma.patientDiagnosis.findMany({
      where: {
        validated: true,
        correctedCondition: {
          not: null
        }
      },
      take: maxLimit,
      select: {
        id: true,
        imageUrl: true,
        condition: true,
        correctedCondition: true,
        correctedSeverity: true,
        severity: true,
        specialistNotes: true,
        validatedAt: true,
        validatedBy: true
      }
    });

    // Filtrar apenas os que têm correção diferente da condição original
    const corrections = diagnoses.filter(
      d => d.correctedCondition && d.correctedCondition !== d.condition
    );

    return {
      data: corrections,
      total: corrections.length
    };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter estatísticas de aprendizado de máquina (apenas admin)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estatísticas de ML retornadas com sucesso'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Acesso negado - apenas administradores'
  })
  async getMLStats(@Request() req) {
    await this.verifyAdminRole(req.user.id);
    return this.mlTrainingService.getMLStats();
  }

  @Post('retrain')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Forçar retreinamento do modelo (apenas admin)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Retreinamento iniciado com sucesso'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Acesso negado - apenas administradores'
  })
  async forceRetraining(@Request() req) {
    await this.verifyAdminRole(req.user.id);
    return this.mlTrainingService.forceRetraining();
  }

  @Get('training-data')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Visualizar dados de treinamento disponíveis (apenas admin)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dados de treinamento retornados com sucesso'
  })
  async getTrainingData(@Request() req): Promise<{
    availableExamples: number;
    examples: TrainingData[];
    summary: {
      totalExamples: number;
      conditionDistribution: Record<string, number>;
    };
  }> {
    await this.verifyAdminRole(req.user.id);

    const trainingData = await this.mlTrainingService.collectTrainingData();

    return {
      availableExamples: trainingData.length,
      examples: trainingData.slice(0, 10), // Mostrar apenas os primeiros 10 para preview
      summary: {
        totalExamples: trainingData.length,
        conditionDistribution: trainingData.reduce((acc, item) => {
          acc[item.correctLabel] = (acc[item.correctLabel] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      }
    };
  }
}
