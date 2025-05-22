import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'Título da notificação',
    example: 'Lembrete de Diagnóstico',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Mensagem da notificação',
    example: 'É hora de realizar um novo diagnóstico ocular. Mantenha sua saúde visual em dia!',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Tipo da notificação',
    example: 'info',
    enum: ['info', 'success', 'warning', 'error'],
  })
  @IsEnum(['info', 'success', 'warning', 'error'])
  type: string;
}
