import { Module } from '@nestjs/common';
import { ClinicController } from './clinic.controller';
import { ClinicService } from './clinic.service';
import { PatientDiagnosisService } from './patient-diagnosis.service';
import { SpecialistFeedbackService } from './specialist-feedback.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DiagnosisModule } from '../diagnosis/diagnosis.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AiModule } from '../ai/ai.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, DiagnosisModule, NotificationsModule, AiModule, EmailModule],
  controllers: [ClinicController],
  providers: [ClinicService, PatientDiagnosisService, SpecialistFeedbackService],
  exports: [ClinicService, PatientDiagnosisService, SpecialistFeedbackService]
})
export class ClinicModule {}
