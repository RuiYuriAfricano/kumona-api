import { IsString, IsInt, IsArray, IsIn, Min, Max } from 'class-validator';

export class CreateDiagnosisDto {
  @IsString()
  imageUrl: string;

  @IsString()
  condition: string;

  @IsString()
  @IsIn(['low', 'medium', 'high'])
  severity: string;

  @IsInt()
  @Min(0)
  @Max(100)
  score: number;

  @IsString()
  description: string;

  @IsArray()
  @IsString({ each: true })
  recommendations: string[];

  @IsInt()
  userId: number;
}
