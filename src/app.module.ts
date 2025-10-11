import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DiagnosisModule } from './diagnosis/diagnosis.module';
import { PreventionModule } from './prevention/prevention.module';
import { ProgressModule } from './progress/progress.module';
import { AiModule } from './ai/ai.module';
import { NotificationsModule } from './notifications/notifications.module';
import { GamificationModule } from './gamification/gamification.module';
import { NotificationModule } from './notifications/notification.module';
import { WebsocketModule } from './websocket/websocket.module';
import { AdminModule } from './admin/admin.module';
import { ClinicModule } from './clinic/clinic.module';
import { DoctorsModule } from './doctors/doctors.module';
import { MLModule } from './ml/ml.module';
import { HealthController } from './health.controller';
import { AppModule as AppInfoModule } from './app/app.module';
import { HelpModule } from './help/help.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '.env.production', '.env.development', '.env.local'],
    }),
    UserModule,
    PrismaModule,
    AuthModule,
    DiagnosisModule,
    PreventionModule,
    ProgressModule,
    AiModule,
    NotificationsModule,
    GamificationModule,
    NotificationModule,
    WebsocketModule,
    AdminModule,
    ClinicModule,
    DoctorsModule,
    MLModule,
    AppInfoModule,
    HelpModule,
  ],
  controllers: [HealthController],
  providers: [PrismaService],
})
export class AppModule {}
