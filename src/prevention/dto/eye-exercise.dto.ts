import { ApiProperty } from '@nestjs/swagger';

export class EyeExerciseDto {
  @ApiProperty({
    description: 'ID do exercício ocular',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Título do exercício',
    example: 'Exercício de Foco',
  })
  title: string;

  @ApiProperty({
    description: 'Descrição do exercício',
    example: 'Fortalece os músculos oculares e melhora a capacidade de foco',
  })
  description: string;

  @ApiProperty({
    description: 'Instruções passo a passo para realizar o exercício',
    example: [
      'Segure um dedo a cerca de 15 cm do seu rosto',
      'Foque nele por 15 segundos',
      'Olhe para um objeto distante por 15 segundos',
      'Repita 5 vezes',
    ],
    isArray: true,
  })
  instructions: string[];

  @ApiProperty({
    description: 'Duração do exercício em minutos',
    example: 2,
  })
  duration: number;

  @ApiProperty({
    description: 'URL da imagem ilustrativa do exercício',
    example: 'https://storage.example.com/exercises/focus.jpg',
    required: false,
  })
  imageUrl?: string;

  @ApiProperty({
    description: 'URL do vídeo demonstrativo do exercício',
    example: 'https://storage.example.com/exercises/focus.mp4',
    required: false,
  })
  videoUrl?: string;

  @ApiProperty({
    description: 'Data de criação do exercício',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;
}
