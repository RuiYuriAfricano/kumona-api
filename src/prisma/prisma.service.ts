import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect(); // Conecta ao banco de dados ao iniciar o módulo
  }

  async onModuleDestroy() {
    await this.$disconnect(); // Desconecta do banco de dados ao destruir o módulo
  }
}
