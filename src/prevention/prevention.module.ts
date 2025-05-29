import { Module } from '@nestjs/common';
import { PreventionController } from './prevention.controller';
import { PreventionService } from './prevention.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [PreventionController],
  providers: [PreventionService],
  exports: [PreventionService],
})
export class PreventionModule {}
