import { ApiProperty } from '@nestjs/swagger';

export class PreventionTipDto {
  @ApiProperty({
    description: 'ID da dica de prevenção',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Título da dica de prevenção',
    example: 'Exames Regulares',
  })
  title: string;

  @ApiProperty({
    description: 'Descrição detalhada da dica de prevenção',
    example: 'Faça exames oftalmológicos regulares, pelo menos uma vez por ano.',
  })
  description: string;

  @ApiProperty({
    description: 'Categoria da dica de prevenção',
    example: 'checkup',
  })
  category: string;

  @ApiProperty({
    description: 'Data de criação da dica',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;
}
