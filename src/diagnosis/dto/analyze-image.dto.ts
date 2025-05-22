import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AnalyzeImageDto {
  @ApiProperty({
    description: 'URL da imagem a ser analisada',
    example: 'https://storage.example.com/images/eye-image-123456.jpg',
  })
  @IsNotEmpty()
  @IsString()
  imageUrl: string;
}
