import { IsString, IsEmail, IsOptional, IsDateString, IsBoolean } from 'class-validator';
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
  profileImage?: string;

  @IsOptional()
  @Type(() => UpdateMedicalHistoryDto)
  medicalHistory?: UpdateMedicalHistoryDto;

  @IsOptional()
  @Type(() => UpdatePreferencesDto)
  preferences?: UpdatePreferencesDto;
}
