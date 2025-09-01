import { IsString, IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSpecialistFeedbackDto {
  @ApiProperty({ description: 'Se o diagnóstico da IA estava correto' })
  @IsBoolean()
  isCorrect: boolean;

  @ApiPropertyOptional({ description: 'Condição correta segundo o especialista' })
  @IsOptional()
  @IsString()
  correctCondition?: string;

  @ApiPropertyOptional({ description: 'Severidade correta segundo o especialista' })
  @IsOptional()
  @IsString()
  correctSeverity?: string;

  @ApiProperty({ description: 'Confiança do especialista (1-10)', minimum: 1, maximum: 10 })
  @IsNumber()
  @Min(1)
  @Max(10)
  confidence: number;

  @ApiPropertyOptional({ description: 'Observações do especialista' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Nome do especialista' })
  @IsString()
  specialistName: string;

  @ApiProperty({ description: 'CRM do especialista' })
  @IsString()
  specialistCrm: string;

  @ApiProperty({ description: 'Especialidade do médico' })
  @IsString()
  specialistSpecialty: string;
}

export class ValidateDiagnosisDto {
  @ApiProperty({ description: 'Se o diagnóstico está validado' })
  @IsBoolean()
  validated: boolean;

  @ApiPropertyOptional({ description: 'Condição corrigida (se diferente da IA)' })
  @IsOptional()
  @IsString()
  correctedCondition?: string;

  @ApiPropertyOptional({ description: 'Severidade corrigida (se diferente da IA)' })
  @IsOptional()
  @IsString()
  correctedSeverity?: string;

  @ApiPropertyOptional({ description: 'Observações do especialista' })
  @IsOptional()
  @IsString()
  specialistNotes?: string;
}
