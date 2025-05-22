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
  ],
  providers: [PrismaService],
})
export class AppModule {}
