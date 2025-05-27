import { Module } from '@nestjs/common';
import { HelpController } from './help.controller';

@Module({
  controllers: [HelpController],
  providers: [],
})
export class HelpModule {}
