import { IsString, IsEmail, IsOptional, IsArray, Length, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateClinicProfileDto {
  @ApiPropertyOptional({ description: 'Nome da clínica' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @ApiPropertyOptional({ description: 'Endereço da clínica' })
  @IsOptional()
  @IsString()
  @Length(5, 200)
  address?: string;

  @ApiPropertyOptional({ description: 'Cidade' })
  @IsOptional()
  @IsString()
  @Length(2, 50)
  city?: string;

  @ApiPropertyOptional({ description: 'Estado' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  state?: string;

  @ApiPropertyOptional({ description: 'CEP' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}-?\d{3}$/, {
    message: 'CEP deve estar no formato XXXXX-XXX'
  })
  zipCode?: string;

  @ApiPropertyOptional({ description: 'Telefone da clínica' })
  @IsOptional()
  @IsString()
  @Matches(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, {
    message: 'Telefone deve estar no formato (XX) XXXXX-XXXX'
  })
  phone?: string;

  @ApiPropertyOptional({ description: 'Email da clínica' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Website da clínica' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ description: 'Especialidades médicas', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @ApiPropertyOptional({ description: 'Descrição da clínica' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiPropertyOptional({ description: 'URL do logo da clínica' })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional({ description: 'Nome do responsável' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  responsibleName?: string;

  @ApiPropertyOptional({ description: 'CRM do médico responsável' })
  @IsOptional()
  @IsString()
  responsibleCrm?: string;
}
