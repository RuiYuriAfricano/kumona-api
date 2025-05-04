import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Torna o PrismaModule global (acessível a todos os módulos sem precisar importar explicitamente)
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Exporta o PrismaService para outros módulos
})
export class PrismaModule {}
