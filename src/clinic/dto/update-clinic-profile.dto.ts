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

  @ApiPropertyOptional({ description: 'Código Postal' })
  @IsOptional()
  @IsString()
  @Length(0, 20)
  zipCode?: string;

  @ApiPropertyOptional({ description: 'NIF da clínica' })
  @IsOptional()
  @IsString()
  nif?: string;

  @ApiPropertyOptional({ description: 'Telefone da clínica' })
  @IsOptional()
  @IsString()
  @Matches(/^\(\d{3}\)\s\d{3}-\d{3}-\d{3}$|^\+\d{3}\s\d{3}\s\d{3}\s\d{3}$/, {
    message: 'Telefone deve estar no formato (244) XXX-XXX-XXX ou +244 XXX XXX XXX'
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
