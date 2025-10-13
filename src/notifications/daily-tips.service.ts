import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class DailyTipsService {
  private readonly logger = new Logger(DailyTipsService.name);

  private readonly tips = [
    {
      title: '👁️ Dica de Saúde Ocular',
      message: 'Lembre-se de piscar com frequência! Piscar ajuda a manter os olhos hidratados e limpos.',
      type: 'info'
    },
    {
      title: '💻 Cuidado com as Telas',
      message: 'Siga a regra 20-20-20: a cada 20 minutos, olhe para algo a 20 pés de distância por 20 segundos.',
      type: 'info'
    },
    {
      title: '🥕 Alimentação Saudável',
      message: 'Consuma alimentos ricos em vitamina A, como cenoura, espinafre e batata-doce para manter a saúde dos olhos.',
      type: 'info'
    },
    {
      title: '☀️ Proteção Solar',
      message: 'Use óculos de sol com proteção UV sempre que sair ao ar livre, mesmo em dias nublados.',
      type: 'info'
    },
    {
      title: '💧 Hidratação',
      message: 'Mantenha-se hidratado! Beber água suficiente ajuda a manter os olhos lubrificados.',
      type: 'info'
    },
    {
      title: '😴 Descanso Visual',
      message: 'Durma pelo menos 7-8 horas por noite. O descanso adequado é essencial para a saúde ocular.',
      type: 'info'
    },
    {
      title: '🧼 Higiene Ocular',
      message: 'Lave as mãos antes de tocar nos olhos e evite esfregar os olhos com força.',
      type: 'info'
    },
    {
      title: '🏃‍♂️ Exercícios Oculares',
      message: 'Faça exercícios oculares simples: mova os olhos em círculos, para cima e para baixo, e de um lado para o outro.',
      type: 'info'
    },
    {
      title: '🔍 Exames Regulares',
      message: 'Faça exames oftalmológicos regulares, mesmo que não tenha sintomas. A prevenção é o melhor remédio!',
      type: 'info'
    },
    {
      title: '💡 Iluminação Adequada',
      message: 'Use iluminação adequada ao ler ou trabalhar. Evite luz muito forte ou muito fraca.',
      type: 'info'
    }
  ];

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  // Executar todos os dias às 9:00 AM
  @Cron('0 9 * * *')
  async sendDailyTips() {
    this.logger.log('Iniciando envio de dicas diárias...');

    try {
      // Buscar todos os usuários ativos
      const users = await this.prisma.user.findMany({
        where: { 
          deleted: false,
          role: 'USER' // Apenas usuários normais
        },
        select: { id: true, name: true }
      });

      // Selecionar uma dica aleatória
      const randomTip = this.tips[Math.floor(Math.random() * this.tips.length)];

      let successCount = 0;
      let errorCount = 0;

      // Enviar dica para cada usuário
      for (const user of users) {
        try {
          await this.notificationsService.createNotification(
            user.id,
            randomTip.title,
            randomTip.message,
            randomTip.type
          );
          successCount++;
        } catch (error) {
          this.logger.error(`Erro ao enviar dica diária para usuário ${user.id}:`, error);
          errorCount++;
        }
      }

      this.logger.log(`Dicas diárias enviadas: ${successCount} sucessos, ${errorCount} erros`);
    } catch (error) {
      this.logger.error('Erro ao enviar dicas diárias:', error);
    }
  }

  // Método para enviar dica personalizada para um usuário específico
  async sendPersonalizedTip(userId: number, tipIndex?: number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId, deleted: false },
        select: { id: true, name: true }
      });

      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Usar índice específico ou selecionar aleatoriamente
      const selectedTip = tipIndex !== undefined 
        ? this.tips[tipIndex % this.tips.length]
        : this.tips[Math.floor(Math.random() * this.tips.length)];

      await this.notificationsService.createNotification(
        userId,
        selectedTip.title,
        selectedTip.message,
        selectedTip.type
      );

      this.logger.log(`Dica personalizada enviada para usuário ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(`Erro ao enviar dica personalizada para usuário ${userId}:`, error);
      return false;
    }
  }

  // Método para obter todas as dicas disponíveis
  getAllTips() {
    return this.tips;
  }

  // Método para obter uma dica específica
  getTip(index: number) {
    return this.tips[index % this.tips.length];
  }
}
