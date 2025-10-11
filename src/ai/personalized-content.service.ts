import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAIService } from './openai.service';
import { GeminiService } from './gemini.service';

interface UserProfile {
  id: number;
  name: string;
  birthDate: Date;
  medicalHistory?: {
    existingConditions: string[];
    familyHistory: string[];
    medications: string[];
  };
  diagnoses?: Array<{
    condition: string;
    severity: string;
    score: number;
    createdAt: Date;
  }>;
}

interface GeneratedTip {
  title: string;
  description: string;
  category: string;
}

interface GeneratedExercise {
  title: string;
  description: string;
  instructions: string[];
  duration: number;
  category: string;
}

@Injectable()
export class PersonalizedContentService {
  private readonly logger = new Logger(PersonalizedContentService.name);

  constructor(
    private prisma: PrismaService,
    private openaiService: OpenAIService,
    private geminiService: GeminiService
  ) {}

  /**
   * Gera dicas personalizadas para um usuário (método público)
   */
  async generatePersonalizedTips(userProfile: UserProfile, count: number = 5): Promise<GeneratedTip[]> {
    return this.generateTipsWithAI(userProfile, count);
  }

  /**
   * Gera e salva dicas personalizadas diárias para um usuário
   * SOLUÇÃO ULTRA-SIMPLES: Apenas verifica data e gera se necessário
   */
  async generateDailyTips(userId: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    this.logger.log(`🤖 [PersonalizedContent] Verificando dicas para usuário ${userId} - data: ${today}`);

    // Verificar se já existem dicas para hoje (SIMPLES!)
    const existingTips = await this.prisma.userTip.findMany({
      where: {
        userId,
        dailyDate: today
      }
    });

    // Se já tem dicas para hoje, não fazer nada
    if (existingTips.length > 0) {
      this.logger.log(`✅ [PersonalizedContent] Usuário ${userId} já possui ${existingTips.length} dicas para ${today}`);
      return;
    }

    this.logger.log(`🤖 [PersonalizedContent] Gerando dicas para usuário ${userId} - data: ${today}`);

    // Gerar novas dicas
    const userProfile = await this.getUserProfile(userId);
    const newTips = await this.generateTipsWithAI(userProfile, 10);

    // Salvar com data de hoje (SIMPLES!)
    for (const tip of newTips) {
      await this.prisma.userTip.create({
        data: {
          title: tip.title,
          description: tip.description,
          category: tip.category,
          display: true,
          generatedBy: 'ai',
          userId,
          dailyDate: today // Campo simples com data
        }
      });
    }

    this.logger.log(`✅ [PersonalizedContent] ${newTips.length} dicas geradas para usuário ${userId} - data: ${today}`);
  }



  /**
   * Obtém dicas diárias ativas do usuário
   * SOLUÇÃO ULTRA-SIMPLES: Busca por data de hoje
   */
  async getDailyTips(userId: number) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Buscar dicas de hoje (SIMPLES!)
    const tips = await this.prisma.userTip.findMany({
      where: {
        userId,
        dailyDate: today
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    this.logger.log(`📅 [PersonalizedContent] Retornando ${tips.length} dicas para usuário ${userId} - data: ${today}`);
    return tips;
  }



  /**
   * Salva uma dica como favorita
   */
  async saveTip(userId: number, tipId: number, tipType: 'general' | 'personal') {
    try {
      this.logger.log(`🔍 [PersonalizedContentService] saveTip iniciado: userId=${userId}, tipId=${tipId}, tipType=${tipType}`);

      const data: any = {
        userId,
        tipType
      };

      if (tipType === 'general') {
        data.tipId = tipId;
      } else {
        data.userTipId = tipId;
      }

      this.logger.log(`🔍 [PersonalizedContentService] Dados para salvar:`, data);

      // Verificar se já existe antes de criar para evitar erro de constraint única
      const existingTip = await this.prisma.savedTip.findFirst({
        where: {
          userId,
          tipType,
          ...(tipType === 'general' ? { tipId } : { userTipId: tipId })
        }
      });

      if (existingTip) {
        this.logger.log(`[saveTip] Dica ${tipId} (${tipType}) já está salva para usuário ${userId}`);
        return existingTip;
      }

      this.logger.log(`🔍 [PersonalizedContentService] Criando nova entrada na tabela savedTip...`);
      const result = await this.prisma.savedTip.create({ data });
      this.logger.log(`✅ [PersonalizedContentService] Dica salva com sucesso:`, result);

      return result;
    } catch (error) {
      this.logger.error(`❌ [PersonalizedContentService] Erro em saveTip:`, {
        message: error.message,
        stack: error.stack,
        userId,
        tipId,
        tipType
      });
      throw error;
    }
  }

  /**
   * Remove uma dica dos salvos
   */
  async unsaveTip(userId: number, tipId: number, tipType: 'general' | 'personal') {
    const where: any = { userId, tipType };

    if (tipType === 'general') {
      where.tipId = tipId;
    } else {
      where.userTipId = tipId;
    }

    return this.prisma.savedTip.deleteMany({ where });
  }

  /**
   * Obtém dicas salvas do usuário
   */
  async getSavedTips(userId: number) {
    const savedTips = await this.prisma.savedTip.findMany({
      where: { userId },
      include: {
        user: true
      }
    });

    // Buscar detalhes das dicas salvas
    const generalTipIds = savedTips.filter(st => st.tipType === 'general' && st.tipId).map(st => st.tipId).filter(id => id !== null);
    const personalTipIds = savedTips.filter(st => st.tipType === 'personal' && st.userTipId).map(st => st.userTipId).filter(id => id !== null);

    // CORREÇÃO: Buscar dicas salvas independentemente do status display
    // Para dicas pessoais, incluir tanto ativas quanto inativas
    const [generalTips, personalTips] = await Promise.all([
      generalTipIds.length > 0 ? this.prisma.preventionTip.findMany({
        where: { id: { in: generalTipIds } }
      }) : [],
      personalTipIds.length > 0 ? this.prisma.userTip.findMany({
        where: { id: { in: personalTipIds } }
        // Removido filtro display: true para incluir dicas inativas que foram salvas
      }) : []
    ]);

    // Log para debug
    this.logger.log(`[getSavedTips] Usuário ${userId}: ${savedTips.length} dicas salvas, ${generalTipIds.length} gerais, ${personalTipIds.length} pessoais`);
    this.logger.log(`[getSavedTips] IDs salvos originais - gerais: [${generalTipIds.join(', ')}], pessoais: [${personalTipIds.join(', ')}]`);
    this.logger.log(`[getSavedTips] Dicas encontradas - gerais: ${generalTips.length}, pessoais: ${personalTips.length}`);

    // Retornar os IDs originais que foram salvos
    return {
      savedTipIds: [...generalTipIds, ...personalTipIds],
      totalSaved: savedTips.length,
      generalTips,
      personalTips
    };
  }

  /**
   * Obtém perfil completo do usuário para personalização
   */
  private async getUserProfile(userId: number): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        medicalHistory: true,
        diagnoses: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!user) {
      throw new Error(`Usuário ${userId} não encontrado`);
    }

    return {
      id: user.id,
      name: user.name,
      birthDate: user.birthDate,
      medicalHistory: user.medicalHistory || undefined,
      diagnoses: user.diagnoses || []
    };
  }

  /**
   * Gera dicas usando APENAS Gemini - sem fallback estático
   */
  private async generateTipsWithAI(userProfile: UserProfile, count: number): Promise<GeneratedTip[]> {
    // Verificar se Gemini está disponível
    if (!this.geminiService.isAvailable()) {
      this.logger.error(`❌ [PersonalizedContent] Gemini não está disponível - não é possível gerar dicas`);
      throw new Error('Gemini service não está disponível. Configure GEMINI_API_KEY para gerar dicas personalizadas.');
    }

    try {
      this.logger.log(`🤖 [PersonalizedContent] Usando APENAS Gemini para gerar dicas para usuário ${userProfile.id}`);
      // Converter UserProfile local para UserProfile do Gemini
      const geminiProfile = this.convertToGeminiProfile(userProfile);
      const aiTips = await this.geminiService.generatePersonalizedTips(geminiProfile, count);
      this.logger.log(`✅ [PersonalizedContent] Gemini gerou ${aiTips.length} dicas com sucesso`);
      return aiTips;
    } catch (error) {
      this.logger.error(`❌ [PersonalizedContent] Erro ao usar Gemini para gerar dicas:`, error);
      throw new Error(`Falha ao gerar dicas com Gemini: ${error.message}`);
    }
  }







  /**
   * Calcula idade baseada na data de nascimento
   */
  private calculateAge(birthDate: Date): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }



  /**
   * Converte UserProfile local para UserProfile do Gemini
   */
  private convertToGeminiProfile(userProfile: UserProfile): import('./gemini.service').UserProfile {
    return {
      id: userProfile.id.toString(),
      name: userProfile.name,
      email: `user${userProfile.id}@kumona.app`, // Email fictício baseado no ID
      birthDate: userProfile.birthDate,
      medicalHistory: {
        existingConditions: userProfile.medicalHistory?.existingConditions || [],
        familyHistory: userProfile.medicalHistory?.familyHistory || [],
        medications: userProfile.medicalHistory?.medications || []
      },
      diagnoses: (userProfile.diagnoses || []).map(diagnosis => ({
        condition: diagnosis.condition,
        severity: diagnosis.severity,
        date: diagnosis.createdAt
      }))
    };
  }
}
