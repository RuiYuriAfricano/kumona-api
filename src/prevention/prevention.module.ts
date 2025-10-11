import { Module } from '@nestjs/common';
import { PreventionController } from './prevention.controller';
import { PreventionService } from './prevention.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { GamificationModule } from '../gamification/gamification.module';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [PrismaModule, AiModule, GamificationModule, NotificationModule],
  controllers: [PreventionController],
  providers: [PreventionService],
  exports: [PreventionService],
})
export class PreventionModule {}
