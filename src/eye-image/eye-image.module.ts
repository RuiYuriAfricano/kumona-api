import { Module } from '@nestjs/common';
import { EyeImageService } from './eye-image.service';
import { EyeImageController } from './eye-image.controller';

@Module({
  providers: [EyeImageService],
  controllers: [EyeImageController],
})
export class EyeImageModule {}
