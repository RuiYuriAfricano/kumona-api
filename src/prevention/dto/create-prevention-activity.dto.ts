import { IsString, IsInt, IsOptional, IsIn, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePreventionActivityDto {
  @ApiProperty({
    description: 'Tipo de atividade de prevenção',
    example: 'exercise',
    enum: ['exercise', 'rest', 'medication'],
  })
  @IsString()
  @IsIn(['exercise', 'rest', 'medication'])
  type: string;

  @ApiProperty({
    description: 'Descrição da atividade realizada',
    example: 'Exercício de palming para relaxamento ocular',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Duração da atividade em minutos',
    example: 10,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  duration: number; // em minutos

  @ApiProperty({
    description: 'Observações adicionais sobre a atividade',
    example: 'Senti melhora na fadiga ocular após o exercício',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
