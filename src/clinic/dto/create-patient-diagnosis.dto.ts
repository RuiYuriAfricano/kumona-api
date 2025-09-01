import { IsString, IsNumber, IsArray, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePatientDiagnosisDto {
  @ApiProperty({ description: 'URL da imagem analisada' })
  @IsString()
  imageUrl: string;

  @ApiProperty({ description: 'Condição diagnosticada' })
  @IsString()
  condition: string;

  @ApiProperty({ description: 'Severidade', enum: ['low', 'medium', 'high'] })
  @IsString()
  severity: string;

  @ApiProperty({ description: 'Score do diagnóstico (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @ApiProperty({ description: 'Descrição detalhada do diagnóstico' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Recomendações', type: [String] })
  @IsArray()
  @IsString({ each: true })
  recommendations: string[];

  @ApiProperty({ description: 'ID do paciente' })
  @IsNumber()
  patientId: number;
}
