import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class UploadImageResponseDto {
  @ApiProperty({
    description: 'URL da imagem armazenada',
    example: 'https://storage.example.com/images/eye-image-123456.jpg',
  })
  imageUrl: string;

  @ApiProperty({
    description: 'Indica se o upload foi bem-sucedido',
    example: true,
  })
  success: boolean;
}
