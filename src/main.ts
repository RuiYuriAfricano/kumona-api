import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Definir porta do servidor via variável de ambiente ou padrão 3000
  const PORT = process.env.PORT || 3000;
  await app.listen(PORT);
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
}
bootstrap();
