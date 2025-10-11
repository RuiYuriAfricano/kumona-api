import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PersonalizedContentService } from './personalized-content.service';

@Injectable()
export class DailyContentService {
  private readonly logger = new Logger(DailyContentService.name);

  constructor(
    private prisma: PrismaService,
    private personalizedContentService: PersonalizedContentService
  ) {}

  /**
   * Gera conteúdo diário para todos os usuários ativos
   * Executa todos os dias às 6:00 AM
   * Agora com controle inteligente para evitar regenerações desnecessárias
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async generateDailyContentForAllUsers() {
    this.logger.log('🕕 [DailyContent] Iniciando geração de conteúdo diário para todos os usuários (com cache inteligente)');

    try {
      // Buscar todos os usuários ativos que têm pelo menos um diagnóstico
      const activeUsers = await this.prisma.user.findMany({
        where: {
          deleted: false,
          diagnoses: {
            some: {} // Usuários que têm pelo menos um diagnóstico
          }
        },
        select: {
          id: true,
          name: true,
          email: true
        }
      });

      this.logger.log(`📊 [DailyContent] Encontrados ${activeUsers.length} usuários ativos para geração de conteúdo`);

      let successCount = 0;
      let errorCount = 0;

      // Gerar conteúdo para cada usuário
      for (const user of activeUsers) {
        try {
          await this.generateDailyContentForUser(user.id);
          successCount++;
          this.logger.log(`✅ [DailyContent] Conteúdo gerado com sucesso para usuário ${user.id} (${user.name})`);
        } catch (error) {
          errorCount++;
          this.logger.error(`❌ [DailyContent] Erro ao gerar conteúdo para usuário ${user.id} (${user.name}):`, error);
        }

        // Pequeno delay entre usuários para não sobrecarregar o sistema
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      this.logger.log(`🎯 [DailyContent] Geração concluída: ${successCount} sucessos, ${errorCount} erros`);

    } catch (error) {
      this.logger.error('💥 [DailyContent] Erro crítico na geração de conteúdo diário:', error);
    }
  }

  /**
   * Gera conteúdo diário para um usuário específico
   */
  async generateDailyContentForUser(userId: number) {
    this.logger.log(`🤖 [DailyContent] Gerando conteúdo diário para usuário ${userId}`);

    try {
      // Gerar dicas personalizadas (10 por dia)
      await this.personalizedContentService.generateDailyTips(userId);



      this.logger.log(`✅ [DailyContent] Conteúdo diário gerado com sucesso para usuário ${userId}`);

    } catch (error) {
      this.logger.error(`❌ [DailyContent] Erro ao gerar conteúdo para usuário ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Limpa conteúdo antigo (mais de 7 dias)
   * Executa todos os domingos às 2:00 AM
   */
  @Cron('0 2 * * 0') // Domingo às 2:00 AM
  async cleanupOldContent() {
    this.logger.log('🧹 [DailyContent] Iniciando limpeza de conteúdo antigo');

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Limpar dicas antigas
      const deletedTips = await this.prisma.userTip.deleteMany({
        where: {
          display: false,
          createdAt: {
            lt: sevenDaysAgo
          }
        }
      });

      this.logger.log(`🗑️ [DailyContent] Limpeza concluída: ${deletedTips.count} dicas removidas`);

    } catch (error) {
      this.logger.error('💥 [DailyContent] Erro na limpeza de conteúdo antigo:', error);
    }
  }

  /**
   * Gera conteúdo manualmente para um usuário (usado em desenvolvimento ou casos especiais)
   */
  async generateContentManually(userId: number) {
    this.logger.log(`🔧 [DailyContent] Geração manual de conteúdo para usuário ${userId}`);

    try {
      await this.generateDailyContentForUser(userId);
      return {
        success: true,
        message: `Conteúdo gerado com sucesso para usuário ${userId}`
      };
    } catch (error) {
      this.logger.error(`❌ [DailyContent] Erro na geração manual para usuário ${userId}:`, error);
      return {
        success: false,
        message: `Erro ao gerar conteúdo: ${error.message}`
      };
    }
  }

  /**
   * Obtém estatísticas do conteúdo gerado
   */
  async getContentStats() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Contar conteúdo gerado hoje
      const [tipsToday, totalUsers, activeUsers] = await Promise.all([
        this.prisma.userTip.count({
          where: {
            createdAt: {
              gte: today,
              lt: tomorrow
            }
          }
        }),

        this.prisma.user.count({
          where: { deleted: false }
        }),
        this.prisma.user.count({
          where: {
            deleted: false,
            diagnoses: {
              some: {}
            }
          }
        })
      ]);

      return {
        today: {
          tipsGenerated: tipsToday,
          date: today.toISOString().split('T')[0]
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          eligibleForContent: activeUsers
        },
        lastUpdate: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('❌ [DailyContent] Erro ao obter estatísticas:', error);
      throw error;
    }
  }

  /**
   * Força a regeneração de conteúdo para todos os usuários ativos
   * (usado apenas em casos especiais)
   */
  async forceRegenerateAllContent() {
    this.logger.warn('⚠️ [DailyContent] FORÇANDO regeneração de todo o conteúdo');

    try {
      // Desativar todo o conteúdo atual
      await Promise.all([
        this.prisma.userTip.updateMany({
          data: { display: false }
        })
      ]);

      // Gerar novo conteúdo para todos
      await this.generateDailyContentForAllUsers();

      return {
        success: true,
        message: 'Conteúdo regenerado com sucesso para todos os usuários'
      };

    } catch (error) {
      this.logger.error('💥 [DailyContent] Erro na regeneração forçada:', error);
      return {
        success: false,
        message: `Erro na regeneração: ${error.message}`
      };
    }
  }
}
