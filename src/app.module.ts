import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { EyeImageModule } from './eye-image/eye-image.module';

@Module({
  imports: [UserModule, PrismaModule, EyeImageModule],
  providers: [PrismaService],
})
export class AppModule {}
