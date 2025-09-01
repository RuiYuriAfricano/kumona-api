import { IsString, IsEmail, IsOptional, IsArray, IsEnum, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClinicDto {
  @ApiProperty({ description: 'Nome da clínica' })
  @IsString()
  @Length(2, 100)
  name: string;

  @ApiProperty({ description: 'CNPJ da clínica' })
  @IsString()
  @Matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, {
    message: 'CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX'
  })
  cnpj: string;

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
  @Length(2, 2)
  state: string;

  @ApiProperty({ description: 'CEP' })
  @IsString()
  @Matches(/^\d{5}-?\d{3}$/, {
    message: 'CEP deve estar no formato XXXXX-XXX'
  })
  zipCode: string;

  @ApiProperty({ description: 'Telefone da clínica' })
  @IsString()
  @Matches(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, {
    message: 'Telefone deve estar no formato (XX) XXXXX-XXXX'
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

  @ApiProperty({ description: 'CPF do responsável' })
  @IsString()
  @Matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, {
    message: 'CPF deve estar no formato XXX.XXX.XXX-XX'
  })
  responsibleCpf: string;

  @ApiPropertyOptional({ description: 'CRM do médico responsável' })
  @IsOptional()
  @IsString()
  responsibleCrm?: string;

  @ApiProperty({ description: 'ID do usuário que será associado à clínica' })
  userId: number;
}
