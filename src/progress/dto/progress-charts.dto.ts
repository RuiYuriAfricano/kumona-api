import { ApiProperty } from '@nestjs/swagger';

export class ExerciseHistoryItem {
  @ApiProperty({
    description: 'Data do registro',
    example: '2023-01-01',
  })
  date: string;

  @ApiProperty({
    description: 'Número de exercícios realizados',
    example: 5,
  })
  count: number;
}

export class ScreenTimeHistoryItem {
  @ApiProperty({
    description: 'Data do registro',
    example: '2023-01-01',
  })
  date: string;

  @ApiProperty({
    description: 'Tempo de tela em minutos',
    example: 420,
  })
  minutes: number;
}

export class ProgressChartsDto {
  @ApiProperty({
    description: 'Histórico de pontuações de saúde ocular',
    example: [65, 68, 70, 69, 72, 75, 78],
    isArray: true,
  })
  scoreHistory: number[];

  @ApiProperty({
    description: 'Datas dos diagnósticos',
    example: [
      '2023-01-01',
      '2023-02-01',
      '2023-03-01',
      '2023-04-01',
      '2023-05-01',
      '2023-06-01',
      '2023-07-01',
    ],
    isArray: true,
  })
  diagnosisDates: string[];

  @ApiProperty({
    description: 'Histórico de exercícios realizados',
    type: [ExerciseHistoryItem],
  })
  exerciseHistory: ExerciseHistoryItem[];

  @ApiProperty({
    description: 'Histórico de tempo de tela',
    type: [ScreenTimeHistoryItem],
  })
  screenTimeHistory: ScreenTimeHistoryItem[];
}
