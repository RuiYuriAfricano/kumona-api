import { Module } from '@nestjs/common';
import { ClinicController } from './clinic.controller';
import { ClinicService } from './clinic.service';
import { PatientDiagnosisService } from './patient-diagnosis.service';
import { SpecialistFeedbackService } from './specialist-feedback.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ClinicController],
  providers: [ClinicService, PatientDiagnosisService, SpecialistFeedbackService],
  exports: [ClinicService, PatientDiagnosisService, SpecialistFeedbackService]
})
export class ClinicModule {}
