import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ClinicStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED'
}

export class UpdateClinicStatusDto {
  @ApiProperty({ 
    description: 'Novo status da clínica',
    enum: ClinicStatus
  })
  @IsEnum(ClinicStatus)
  status: ClinicStatus;

  @ApiPropertyOptional({ description: 'Observações sobre a mudança de status' })
  @IsOptional()
  @IsString()
  notes?: string;
}
