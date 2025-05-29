import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { OpenAIService } from './openai.service';
import { PersonalizedContentService } from './personalized-content.service';
import { DailyContentService } from './daily-content.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule, ScheduleModule.forRoot()],
  controllers: [AiController],
  providers: [AiService, OpenAIService, PersonalizedContentService, DailyContentService],
  exports: [AiService, OpenAIService, PersonalizedContentService, DailyContentService],
})
export class AiModule {}
