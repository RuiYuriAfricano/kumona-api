import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsArray, MinLength, Matches } from 'class-validator';

export class ClinicSignUpDto {
  // Dados da clínica
  @ApiProperty({ description: 'Nome da clínica' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'NIF da clínica' })
  @IsString()
  nif: string;

  @ApiProperty({ description: 'Endereço da clínica' })
  @IsString()
  address: string;

  @ApiProperty({ description: 'Cidade da clínica' })
  @IsString()
  city: string;

  @ApiProperty({ description: 'Província da clínica' })
  @IsString()
  state: string;

  @ApiProperty({ description: 'Código postal', required: false })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiProperty({ description: 'Telefone da clínica' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Email da clínica' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Website da clínica', required: false })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({ description: 'Especialidades da clínica', type: [String] })
  @IsArray()
  @IsString({ each: true })
  specialties: string[];

  @ApiProperty({ description: 'Descrição da clínica', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  // Dados do responsável
  @ApiProperty({ description: 'Nome do responsável' })
  @IsString()
  responsibleName: string;

  @ApiProperty({ description: 'BI do responsável' })
  @IsString()
  @Matches(/^\d{9}[A-Z]{2}\d{3}$/, {
    message: 'BI deve seguir o formato: 9 números + 2 letras + 3 números (ex: 123456789AB123)'
  })
  responsibleBi: string;

  @ApiProperty({ description: 'CRM do médico responsável', required: false })
  @IsOptional()
  @IsString()
  responsibleCrm?: string;

  // Dados de acesso
  @ApiProperty({ description: 'Senha para acesso', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}
