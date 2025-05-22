import { ApiProperty } from '@nestjs/swagger';

export class ReadNotificationResponseDto {
  @ApiProperty({
    description: 'ID da notificação',
    example: 789,
  })
  id: number;

  @ApiProperty({
    description: 'Indica se a notificação foi lida',
    example: true,
  })
  read: boolean;

  @ApiProperty({
    description: 'Data de atualização da notificação',
    example: '2023-05-22T14:30:00.000Z',
  })
  updatedAt: Date;
}
