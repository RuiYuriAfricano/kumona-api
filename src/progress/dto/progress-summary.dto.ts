import { ApiProperty } from '@nestjs/swagger';

export class ProgressSummaryDto {
  @ApiProperty({
    description: 'Pontuação atual de saúde ocular',
    example: 78,
  })
  currentScore: number;

  @ApiProperty({
    description: 'Pontuação anterior de saúde ocular',
    example: 72,
  })
  previousScore: number;

  @ApiProperty({
    description: 'Mudança na pontuação (em porcentagem)',
    example: 6,
  })
  scoreChange: number;

  @ApiProperty({
    description: 'Tempo médio de tela por dia',
    example: '6h 30min',
  })
  screenTimeAvg: string;

  @ApiProperty({
    description: 'Mudança no tempo de tela (em porcentagem)',
    example: -15,
  })
  screenTimeChange: number;

  @ApiProperty({
    description: 'Média diária de pausas',
    example: 8,
  })
  breaksAvg: number;

  @ApiProperty({
    description: 'Mudança no número de pausas (em porcentagem)',
    example: 25,
  })
  breaksChange: number;

  @ApiProperty({
    description: 'Número de exercícios completados',
    example: 12,
  })
  exercisesCompleted: number;

  @ApiProperty({
    description: 'Mudança no número de exercícios (em porcentagem)',
    example: 50,
  })
  exercisesChange: number;
}
