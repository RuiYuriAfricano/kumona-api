import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('app')
@Controller('app')
export class AppController {
  @Get('info')
  @ApiOperation({ summary: 'Obter informações do aplicativo' })
  @ApiResponse({ status: 200, description: 'Informações do aplicativo retornadas com sucesso' })
  getAppInfo() {
    return {
      name: 'Kumona Vision Care',
      version: '1.0.0',
      description: 'Aplicativo de diagnóstico ocular com IA para Angola',
      developer: 'Kumona Team',
      contact: {
        email: 'suporte@kumona.ao',
        phone: '+244 900 000 000',
        website: 'https://kumona.ao'
      },
      features: [
        'Diagnóstico ocular com IA',
        'Dicas de prevenção',
        'Acompanhamento de progresso',
        'Exercícios oculares',
        'Notificações em tempo real'
      ],
      supportedLanguages: ['pt-BR', 'pt-AO'],
      lastUpdated: new Date().toISOString(),
      status: 'active'
    };
  }
}
