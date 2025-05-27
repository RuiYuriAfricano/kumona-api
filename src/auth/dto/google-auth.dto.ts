import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional } from 'class-validator';

export class GoogleAuthDto {
  @ApiProperty({
    description: 'Token de acesso do Google',
    example: 'ya29.a0AfH6SMC...',
  })
  @IsString()
  accessToken: string;

  @ApiProperty({
    description: 'ID do usuário no Google',
    example: '1234567890',
  })
  @IsString()
  googleId: string;

  @ApiProperty({
    description: 'Email do usuário',
    example: 'usuario@gmail.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'João Silva',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'URL da foto de perfil',
    example: 'https://lh3.googleusercontent.com/...',
    required: false,
  })
  @IsOptional()
  @IsString()
  profileImage?: string;
}
