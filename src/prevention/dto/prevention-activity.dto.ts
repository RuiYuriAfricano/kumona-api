import { ApiProperty } from '@nestjs/swagger';

export class PreventionActivityDto {
  @ApiProperty({
    description: 'ID da atividade de prevenção',
    example: 456,
  })
  id: number;

  @ApiProperty({
    description: 'Tipo de atividade de prevenção',
    example: 'exercise',
    enum: ['exercise', 'rest', 'medication'],
  })
  type: string;

  @ApiProperty({
    description: 'Descrição da atividade realizada',
    example: 'Exercício de Foco',
  })
  description: string;

  @ApiProperty({
    description: 'Duração da atividade em minutos',
    example: 2,
  })
  duration: number;

  @ApiProperty({
    description: 'Observações adicionais sobre a atividade',
    example: 'Completado com sucesso',
    required: false,
  })
  notes?: string;

  @ApiProperty({
    description: 'ID do usuário que realizou a atividade',
    example: 1,
  })
  userId: number;

  @ApiProperty({
    description: 'Data e hora de conclusão da atividade',
    example: '2023-05-22T14:30:00.000Z',
  })
  completedAt: Date;
}
