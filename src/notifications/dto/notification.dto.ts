import { ApiProperty } from '@nestjs/swagger';

export class NotificationDto {
  @ApiProperty({
    description: 'ID da notificação',
    example: 789,
  })
  id: number;

  @ApiProperty({
    description: 'Título da notificação',
    example: 'Lembrete de Diagnóstico',
  })
  title: string;

  @ApiProperty({
    description: 'Mensagem da notificação',
    example: 'É hora de realizar um novo diagnóstico ocular. Mantenha sua saúde visual em dia!',
  })
  message: string;

  @ApiProperty({
    description: 'Tipo da notificação',
    example: 'info',
    enum: ['info', 'success', 'warning', 'error'],
  })
  type: string;

  @ApiProperty({
    description: 'Indica se a notificação foi lida',
    example: false,
  })
  read: boolean;

  @ApiProperty({
    description: 'Data de criação da notificação',
    example: '2023-05-22T08:00:00.000Z',
  })
  createdAt: Date;
}
