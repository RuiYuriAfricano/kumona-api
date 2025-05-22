import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Query,
  ParseIntPipe
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
  ApiQuery
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DiagnosisService } from './diagnosis.service';
import { CreateDiagnosisDto } from './dto/create-diagnosis.dto';
import { AnalyzeImageDto } from './dto/analyze-image.dto';
import { UploadImageResponseDto } from './dto/upload-image.dto';
import { NextSuggestionResponseDto } from './dto/next-suggestion.dto';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';

@ApiTags('diagnosis')
@ApiBearerAuth()
@Controller('diagnosis')
export class DiagnosisController {
  constructor(private diagnosisService: DiagnosisService) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload-image')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: 'Fazer upload de imagem ocular',
    description: 'Faz upload da imagem capturada para o servidor'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Imagem do olho para upload'
        }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Imagem enviada com sucesso',
    type: UploadImageResponseDto
  })
  @ApiResponse({ status: 400, description: 'Imagem inválida ou não fornecida' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async uploadImage(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadImageResponseDto> {
    return this.diagnosisService.uploadImage(req.user.id, file);
  }

  @UseGuards(JwtAuthGuard)
  @Post('analyze')
  @ApiOperation({
    summary: 'Analisar imagem ocular',
    description: 'Analisa a imagem enviada e retorna o diagnóstico'
  })
  @ApiBody({ type: AnalyzeImageDto })
  @ApiResponse({ status: 201, description: 'Imagem analisada com sucesso' })
  @ApiResponse({ status: 400, description: 'Imagem inválida ou não fornecida' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 500, description: 'Erro ao processar a imagem' })
  async analyzeImage(
    @Request() req,
    @Body() analyzeDto: AnalyzeImageDto,
  ) {
    return this.diagnosisService.analyzeImageFromUrl(req.user.id, analyzeDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('analyze-file')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: 'Analisar imagem ocular (upload direto)',
    description: 'Envia uma imagem do olho para análise pela IA e retorna um diagnóstico detalhado'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Imagem do olho para análise'
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Imagem analisada com sucesso' })
  @ApiResponse({ status: 400, description: 'Imagem inválida ou não fornecida' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 500, description: 'Erro ao processar a imagem' })
  async analyzeImageFile(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.diagnosisService.analyzeImage(req.user.id, file);
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  @ApiOperation({
    summary: 'Obter histórico de diagnósticos',
    description: 'Retorna o histórico de diagnósticos do usuário com opções de paginação e filtro por data'
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Número máximo de registros a retornar', type: Number })
  @ApiQuery({ name: 'page', required: false, description: 'Número da página para paginação', type: Number })
  @ApiQuery({ name: 'startDate', required: false, description: 'Data inicial para filtro (formato ISO)', type: String })
  @ApiQuery({ name: 'endDate', required: false, description: 'Data final para filtro (formato ISO)', type: String })
  @ApiResponse({ status: 200, description: 'Histórico de diagnósticos retornado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getDiagnosisHistory(
    @Request() req,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.diagnosisService.getDiagnosisHistory(
      req.user.id,
      limit,
      page,
      startDate,
      endDate,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('latest')
  @ApiOperation({
    summary: 'Obter o diagnóstico mais recente',
    description: 'Retorna o diagnóstico mais recente do usuário'
  })
  @ApiResponse({ status: 200, description: 'Diagnóstico retornado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Nenhum diagnóstico encontrado' })
  async getLatestDiagnosis(@Request() req) {
    return this.diagnosisService.getLatestDiagnosis(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('next-suggestion')
  @ApiOperation({
    summary: 'Obter sugestão do próximo diagnóstico',
    description: 'Retorna uma sugestão de quando o usuário deve fazer o próximo diagnóstico'
  })
  @ApiResponse({
    status: 200,
    description: 'Sugestão retornada com sucesso',
    type: NextSuggestionResponseDto
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Nenhum diagnóstico encontrado' })
  async getNextDiagnosisSuggestion(@Request() req): Promise<NextSuggestionResponseDto> {
    return this.diagnosisService.getNextDiagnosisSuggestion(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({
    summary: 'Obter diagnóstico por ID',
    description: 'Retorna os detalhes completos de um diagnóstico específico'
  })
  @ApiParam({ name: 'id', description: 'ID do diagnóstico', type: Number })
  @ApiResponse({ status: 200, description: 'Diagnóstico retornado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Diagnóstico não encontrado' })
  async getDiagnosisById(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.diagnosisService.getDiagnosisById(req.user.id, id);
  }
}
