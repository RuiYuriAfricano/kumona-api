import { IsString, IsEmail, IsOptional, IsArray, IsDateString, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreatePatientDto {
  @ApiProperty({ description: 'Nome completo do paciente' })
  @IsString()
  @Length(2, 100)
  name: string;

  @ApiPropertyOptional({ description: 'Email do paciente' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Telefone do paciente' })
  @IsOptional()
  @IsString()
  @Matches(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, {
    message: 'Telefone deve estar no formato (XX) XXXXX-XXXX'
  })
  phone?: string;

  @ApiPropertyOptional({ description: 'CPF do paciente' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, {
    message: 'CPF deve estar no formato XXX.XXX.XXX-XX'
  })
  cpf?: string;

  @ApiProperty({ description: 'Data de nascimento' })
  @IsDateString()
  birthDate: string;

  @ApiPropertyOptional({ description: 'Gênero', enum: ['M', 'F', 'Other'] })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ description: 'Endereço do paciente' })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  address?: string;

  @ApiPropertyOptional({ description: 'Cidade' })
  @IsOptional()
  @IsString()
  @Length(0, 50)
  city?: string;

  @ApiPropertyOptional({ description: 'Estado' })
  @IsOptional()
  @IsString()
  @Length(0, 2)
  state?: string;

  @ApiPropertyOptional({ description: 'CEP' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}-?\d{3}$/, {
    message: 'CEP deve estar no formato XXXXX-XXX'
  })
  zipCode?: string;

  @ApiPropertyOptional({ description: 'Alergias conhecidas', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => value || [])
  allergies?: string[];

  @ApiPropertyOptional({ description: 'Medicamentos em uso', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => value || [])
  medications?: string[];

  @ApiPropertyOptional({ description: 'Histórico médico', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => value || [])
  medicalHistory?: string[];
}
