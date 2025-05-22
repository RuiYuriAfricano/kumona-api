import { ApiProperty } from '@nestjs/swagger';

export class NextSuggestionResponseDto {
  @ApiProperty({
    description: 'Data do último diagnóstico realizado',
    example: '2023-05-22T12:34:56.789Z',
  })
  lastDiagnosisDate: Date;

  @ApiProperty({
    description: 'Data sugerida para o próximo diagnóstico',
    example: '2023-06-22T00:00:00.000Z',
  })
  nextSuggestedDate: Date;

  @ApiProperty({
    description: 'Número de dias até o próximo diagnóstico sugerido',
    example: 30,
  })
  daysUntilNext: number;

  @ApiProperty({
    description: 'Motivo da sugestão para o próximo diagnóstico',
    example: 'Baseado na sua condição atual (Catarata Inicial), recomendamos um novo diagnóstico em 30 dias para monitorar a progressão.',
  })
  reason: string;

  @ApiProperty({
    description: 'Severidade da última condição diagnosticada',
    example: 'medium',
    enum: ['low', 'medium', 'high'],
  })
  severity: string;
}
