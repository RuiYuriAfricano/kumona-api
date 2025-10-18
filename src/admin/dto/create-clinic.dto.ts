import { IsString, IsEmail, IsOptional, IsArray, IsEnum, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClinicDto {
  @ApiProperty({ description: 'Nome da clínica' })
  @IsString()
  @Length(2, 100)
  name: string;

  @ApiProperty({ description: 'NIF da clínica' })
  @IsString()
  @Matches(/^\d{9}[A-Z]{2}\d{3}$/, {
    message: 'NIF deve seguir o formato: 9 números + 2 letras + 3 números (ex: 123456789AB123)'
  })
  nif: string;

  @ApiProperty({ description: 'Endereço da clínica' })
  @IsString()
  @Length(5, 200)
  address: string;

  @ApiProperty({ description: 'Cidade' })
  @IsString()
  @Length(2, 50)
  city: string;

  @ApiProperty({ description: 'Estado' })
  @IsString()
  @Length(2, 50)
  state: string;

  @ApiProperty({ description: 'Código Postal' })
  @IsString()
  @Length(5, 20)
  zipCode: string;

  @ApiProperty({ description: 'Telefone da clínica' })
  @IsString()
  @Matches(/^\+244\s9\d{2}\s\d{3}\s\d{3}$/, {
    message: 'Telefone deve estar no formato +244 9XX XXX XXX e começar com 9'
  })
  phone: string;

  @ApiProperty({ description: 'Email da clínica' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Website da clínica' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({ description: 'Especialidades médicas', type: [String] })
  @IsArray()
  @IsString({ each: true })
  specialties: string[];

  @ApiPropertyOptional({ description: 'Descrição da clínica' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiPropertyOptional({ description: 'URL do logo da clínica' })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiProperty({ description: 'Nome do responsável' })
  @IsString()
  @Length(2, 100)
  responsibleName: string;

  @ApiProperty({ description: 'BI do responsável' })
  @IsString()
  @Matches(/^\d{9}[A-Z]{2}\d{3}$/, {
    message: 'BI deve seguir o formato: 9 números + 2 letras + 3 números (ex: 123456789AB123)'
  })
  responsibleBi: string;

  @ApiPropertyOptional({ description: 'Número da Ordem dos Médicos' })
  @IsOptional()
  @IsString()
  responsibleCrm?: string;

  @ApiProperty({ description: 'Senha para o usuário da clínica' })
  @IsString()
  @Length(6, 50)
  password: string;
}
