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
  @Matches(/^\(\d{3}\)\s\d{3}-\d{3}-\d{3}$|^\+\d{3}\s\d{3}\s\d{3}\s\d{3}$/, {
    message: 'Telefone deve estar no formato (244) XXX-XXX-XXX ou +244 XXX XXX XXX'
  })
  phone?: string;

  @ApiPropertyOptional({ description: 'BI do paciente' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{9}[A-Z]{2}\d{3}$/, {
    message: 'BI deve estar no formato NNNNNNNNNLLNNN (9 números + 2 letras + 3 números)'
  })
  bi?: string;

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

  @ApiPropertyOptional({ description: 'Código Postal' })
  @IsOptional()
  @IsString()
  @Length(0, 20)
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
