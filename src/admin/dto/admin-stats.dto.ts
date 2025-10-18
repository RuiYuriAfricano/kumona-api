import { ApiProperty } from '@nestjs/swagger';

export class AdminStatsDto {
  @ApiProperty({ description: 'Total de usuários no sistema' })
  totalUsers: number;

  @ApiProperty({ description: 'Total de clínicas registradas' })
  totalClinics: number;

  @ApiProperty({ description: 'Clínicas pendentes de aprovação' })
  pendingClinics: number;

  @ApiProperty({ description: 'Clínicas aprovadas' })
  approvedClinics: number;

  @ApiProperty({ description: 'Clínicas rejeitadas' })
  rejectedClinics: number;

  @ApiProperty({ description: 'Clínicas suspensas' })
  suspendedClinics: number;

  @ApiProperty({ description: 'Total de pacientes no sistema' })
  totalPatients: number;

  @ApiProperty({ description: 'Total de diagnósticos realizados' })
  totalDiagnoses: number;

  @ApiProperty({ description: 'Diagnósticos validados por especialistas' })
  validatedDiagnoses: number;

  @ApiProperty({ description: 'Feedback de especialistas coletado' })
  specialistFeedbacks: number;

  @ApiProperty({ description: 'Novos usuários este mês' })
  newUsersThisMonth: number;

  @ApiProperty({ description: 'Novos diagnósticos este mês' })
  newDiagnosesThisMonth: number;

  @ApiProperty({ description: 'Diagnósticos agrupados por condição', type: 'object' })
  diagnosisByCondition: Record<string, number>;

  @ApiProperty({ description: 'Diagnósticos agrupados por severidade', type: 'object' })
  diagnosisBySeverity: Record<string, number>;
}
