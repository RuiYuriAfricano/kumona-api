import { ApiProperty } from '@nestjs/swagger';

export class ClinicStatsDto {
  @ApiProperty({ description: 'Total de pacientes cadastrados' })
  totalPatients: number;

  @ApiProperty({ description: 'Novos pacientes este mês' })
  newPatientsThisMonth: number;

  @ApiProperty({ description: 'Total de diagnósticos realizados' })
  totalDiagnoses: number;

  @ApiProperty({ description: 'Diagnósticos este mês' })
  diagnosesThisMonth: number;

  @ApiProperty({ description: 'Diagnósticos validados por especialistas' })
  validatedDiagnoses: number;

  @ApiProperty({ description: 'Taxa de validação (%)', example: 85.5 })
  validationRate: number;

  @ApiProperty({ description: 'Diagnósticos por condição' })
  diagnosisByCondition: Record<string, number>;

  @ApiProperty({ description: 'Diagnósticos por severidade' })
  diagnosisBySeverity: Record<string, number>;

  @ApiProperty({ description: 'Média de score dos diagnósticos', example: 78.5 })
  averageScore: number;

  @ApiProperty({ description: 'Pacientes atendidos nos últimos 30 dias' })
  activePatientsLast30Days: number;
}
