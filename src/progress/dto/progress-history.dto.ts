import { ApiProperty } from '@nestjs/swagger';

export class ProgressHistoryItemDto {
  @ApiProperty({
    description: 'Data do registro',
    example: '2023-07-01',
  })
  date: string;

  @ApiProperty({
    description: 'Pontuação de saúde ocular',
    example: 78,
  })
  score: number;

  @ApiProperty({
    description: 'Número de atividades realizadas',
    example: 5,
  })
  activities: number;

  @ApiProperty({
    description: 'Tempo de tela em minutos',
    example: 360,
  })
  screenTime: number;
}
