import {
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  HttpStatus,
  ForbiddenException
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth
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
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
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

  @Get('stats')
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
