import { ApiProperty } from '@nestjs/swagger';

export class ReadAllNotificationsResponseDto {
  @ApiProperty({
    description: 'Indica se a operação foi bem-sucedida',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Número de notificações marcadas como lidas',
    example: 3,
  })
  count: number;

  @ApiProperty({
    description: 'Data de atualização das notificações',
    example: '2023-05-22T14:30:00.000Z',
  })
  updatedAt: Date;
}
