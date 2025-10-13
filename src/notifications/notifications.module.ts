import { Module, forwardRef } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { DailyTipsService } from './daily-tips.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, forwardRef(() => WebsocketModule), EmailModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, DailyTipsService],
  exports: [NotificationsService, DailyTipsService],
})
export class NotificationsModule {}
