import { Module } from '@nestjs/common';
import { MLController } from './ml.controller';
import { MLTrainingService } from './ml-training.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [MLController],
  providers: [MLTrainingService],
  exports: [MLTrainingService]
})
export class MLModule {}
