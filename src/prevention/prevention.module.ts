import { Module } from '@nestjs/common';
import { PreventionController } from './prevention.controller';
import { PreventionService } from './prevention.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PreventionController],
  providers: [PreventionService],
  exports: [PreventionService],
})
export class PreventionModule {}
