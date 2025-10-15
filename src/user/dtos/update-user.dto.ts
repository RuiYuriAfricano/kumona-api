import { IsString, IsEmail, IsOptional, IsDateString, IsBoolean, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMedicalHistoryDto {
  @IsString({ each: true })
  @IsOptional()
  existingConditions?: string[];

  @IsString({ each: true })
  @IsOptional()
  familyHistory?: string[];

  @IsString({ each: true })
  @IsOptional()
  medications?: string[];
}

export class UpdatePreferencesDto {
  @IsBoolean()
  @IsOptional()
  notificationsEnabled?: boolean;

  @IsString()
  @IsOptional()
  reminderFrequency?: string;

  @IsString()
  @IsOptional()
  language?: string;
}

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @IsString()
  @IsOptional()
  about?: string;

  @IsString()
  @IsOptional()
  profileImage?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\+244\s9\d{2}\s\d{3}\s\d{3}$/, {
    message: 'Telefone deve estar no formato +244 9XX XXX XXX e começar com 9'
  })
  phone?: string;

  @IsOptional()
  @Type(() => UpdateMedicalHistoryDto)
  medicalHistory?: UpdateMedicalHistoryDto;

  @IsOptional()
  @Type(() => UpdatePreferencesDto)
  preferences?: UpdatePreferencesDto;
}
