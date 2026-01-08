import { IsString, IsNotEmpty, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({
    description: 'Email do usuário',
    example: 'usuario@exemplo.com'
  })
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @ApiProperty({
    description: 'Código OTP de 6 dígitos',
    example: '123456'
  })
  @IsString({ message: 'OTP deve ser uma string' })
  @IsNotEmpty({ message: 'OTP é obrigatório' })
  otp: string;
}

