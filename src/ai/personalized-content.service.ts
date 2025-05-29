import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAIService } from './openai.service';

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
    private openaiService: OpenAIService
  ) {}

  /**
   * Gera e salva dicas personalizadas diárias para um usuário
   */
  async generateDailyTips(userId: number): Promise<void> {
    try {
      this.logger.log(`🤖 [PersonalizedContent] Gerando dicas diárias para usuário ${userId}`);

      // Desativar dicas antigas (display = false)
      await this.prisma.userTip.updateMany({
        where: { userId, display: true },
        data: { display: false }
      });

      // Gerar novas dicas personalizadas
      const userProfile = await this.getUserProfile(userId);
      const newTips = await this.generateTipsWithAI(userProfile, 10);

      // Salvar novas dicas no banco
      for (const tip of newTips) {
        await this.prisma.userTip.create({
          data: {
            title: tip.title,
            description: tip.description,
            category: tip.category,
            display: true,
            generatedBy: 'ai',
            userId
          }
        });
      }

      this.logger.log(`✅ [PersonalizedContent] ${newTips.length} dicas diárias geradas para usuário ${userId}`);

    } catch (error) {
      this.logger.error(`❌ [PersonalizedContent] Erro ao gerar dicas diárias para usuário ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Gera e salva exercícios personalizados diários para um usuário
   */
  async generateDailyExercises(userId: number): Promise<void> {
    try {
      this.logger.log(`🤖 [PersonalizedContent] Gerando exercícios diários para usuário ${userId}`);

      // Desativar exercícios antigos (display = false)
      await this.prisma.userExercise.updateMany({
        where: { userId, display: true },
        data: { display: false }
      });

      // Gerar novos exercícios personalizados
      const userProfile = await this.getUserProfile(userId);
      const newExercises = await this.generateExercisesWithAI(userProfile, 3);

      // Salvar novos exercícios no banco
      for (const exercise of newExercises) {
        await this.prisma.userExercise.create({
          data: {
            title: exercise.title,
            description: exercise.description,
            instructions: exercise.instructions,
            duration: exercise.duration,
            category: exercise.category,
            display: true,
            generatedBy: 'ai',
            userId
          }
        });
      }

      this.logger.log(`✅ [PersonalizedContent] ${newExercises.length} exercícios diários gerados para usuário ${userId}`);

    } catch (error) {
      this.logger.error(`❌ [PersonalizedContent] Erro ao gerar exercícios diários para usuário ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Obtém dicas diárias ativas do usuário
   */
  async getDailyTips(userId: number) {
    return this.prisma.userTip.findMany({
      where: {
        userId,
        display: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * Obtém exercícios diários ativos do usuário
   */
  async getDailyExercises(userId: number) {
    return this.prisma.userExercise.findMany({
      where: {
        userId,
        display: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * Salva uma dica como favorita
   */
  async saveTip(userId: number, tipId: number, tipType: 'general' | 'personal') {
    const data: any = {
      userId,
      tipType
    };

    if (tipType === 'general') {
      data.tipId = tipId;
    } else {
      data.userTipId = tipId;
    }

    return this.prisma.savedTip.create({ data });
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
    const generalTipIds = savedTips.filter(st => st.tipType === 'general' && st.tipId).map(st => st.tipId);
    const personalTipIds = savedTips.filter(st => st.tipType === 'personal' && st.userTipId).map(st => st.userTipId);

    const [generalTips, personalTips] = await Promise.all([
      generalTipIds.length > 0 ? this.prisma.preventionTip.findMany({
        where: { id: { in: generalTipIds } }
      }) : [],
      personalTipIds.length > 0 ? this.prisma.userTip.findMany({
        where: { id: { in: personalTipIds } }
      }) : []
    ]);

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
   * Gera dicas usando IA real ou fallback baseado no perfil do usuário
   */
  private async generateTipsWithAI(userProfile: UserProfile, count: number): Promise<GeneratedTip[]> {
    // Tentar usar OpenAI primeiro
    if (this.openaiService.isAvailable()) {
      try {
        this.logger.log(`🤖 [PersonalizedContent] Usando OpenAI para gerar dicas para usuário ${userProfile.id}`);
        const aiTips = await this.openaiService.generatePersonalizedTips(userProfile, count);
        this.logger.log(`✅ [PersonalizedContent] OpenAI gerou ${aiTips.length} dicas com sucesso`);
        return aiTips;
      } catch (error) {
        this.logger.error(`❌ [PersonalizedContent] Erro ao usar OpenAI, usando fallback:`, error);
        // Continuar para fallback
      }
    } else {
      this.logger.log(`⚠️ [PersonalizedContent] OpenAI não disponível, usando lógica de fallback`);
    }

    // Fallback: usar lógica baseada em regras
    return this.generateTipsWithFallback(userProfile, count);
  }

  /**
   * Gera dicas usando lógica de fallback (regras)
   */
  private async generateTipsWithFallback(userProfile: UserProfile, count: number): Promise<GeneratedTip[]> {
    const age = this.calculateAge(userProfile.birthDate);
    const hasConditions = userProfile.medicalHistory?.existingConditions?.length > 0;
    const recentDiagnoses = userProfile.diagnoses?.slice(0, 3) || [];

    const tips: GeneratedTip[] = [];

    // Dicas baseadas na idade
    if (age < 30) {
      tips.push({
        title: "Proteção Digital para Jovens",
        description: `Olá ${userProfile.name}! Como você está na faixa dos ${age} anos, é importante estabelecer bons hábitos digitais desde cedo. Use a regra 20-20-20: a cada 20 minutos, olhe para algo a 20 pés de distância por 20 segundos.`,
        category: "digital_health"
      });
    } else if (age >= 40) {
      tips.push({
        title: "Cuidados Especiais após os 40",
        description: `${userProfile.name}, após os 40 anos, os olhos precisam de atenção especial. Faça exames regulares para detectar precocemente glaucoma e degeneração macular.`,
        category: "checkup"
      });
    }

    // Dicas baseadas em condições médicas
    if (hasConditions) {
      tips.push({
        title: "Cuidados Especiais para seu Histórico",
        description: "Considerando seu histórico médico, mantenha consultas regulares com oftalmologista e siga rigorosamente as orientações médicas.",
        category: "medical_care"
      });
    }

    // Completar com dicas genéricas personalizadas
    const genericTips = this.getPersonalizedGenericTips(userProfile);
    while (tips.length < count) {
      const randomTip = genericTips[Math.floor(Math.random() * genericTips.length)];
      tips.push(randomTip);
    }

    return tips.slice(0, count);
  }

  /**
   * Gera exercícios usando IA real ou fallback baseado no perfil do usuário
   */
  private async generateExercisesWithAI(userProfile: UserProfile, count: number): Promise<GeneratedExercise[]> {
    // Tentar usar OpenAI primeiro
    if (this.openaiService.isAvailable()) {
      try {
        this.logger.log(`🤖 [PersonalizedContent] Usando OpenAI para gerar exercícios para usuário ${userProfile.id}`);
        const aiExercises = await this.openaiService.generatePersonalizedExercises(userProfile, count);
        this.logger.log(`✅ [PersonalizedContent] OpenAI gerou ${aiExercises.length} exercícios com sucesso`);
        return aiExercises;
      } catch (error) {
        this.logger.error(`❌ [PersonalizedContent] Erro ao usar OpenAI para exercícios, usando fallback:`, error);
        // Continuar para fallback
      }
    } else {
      this.logger.log(`⚠️ [PersonalizedContent] OpenAI não disponível para exercícios, usando lógica de fallback`);
    }

    // Fallback: usar lógica baseada em regras
    return this.generateExercisesWithFallback(userProfile, count);
  }

  /**
   * Gera exercícios usando lógica de fallback (regras)
   */
  private async generateExercisesWithFallback(userProfile: UserProfile, count: number): Promise<GeneratedExercise[]> {
    const age = this.calculateAge(userProfile.birthDate);
    const exercises: GeneratedExercise[] = [];

    // Exercícios baseados na idade
    if (age < 35) {
      exercises.push({
        title: "Foco Dinâmico para Jovens",
        description: "Exercício de foco rápido ideal para quem usa muito dispositivos digitais",
        instructions: [
          "Segure o dedo a 15cm do rosto",
          "Foque no dedo por 3 segundos",
          "Mude o foco para um objeto distante por 3 segundos",
          "Repita 10 vezes"
        ],
        duration: 5,
        category: "focus_training"
      });
    } else {
      exercises.push({
        title: "Relaxamento Ocular Suave",
        description: "Exercício de relaxamento adequado para olhos mais maduros",
        instructions: [
          "Feche os olhos suavemente",
          "Respire profundamente por 30 segundos",
          "Abra os olhos lentamente",
          "Pisque 20 vezes devagar"
        ],
        duration: 3,
        category: "relaxation"
      });
    }

    // Completar com exercícios genéricos
    const genericExercises = this.getGenericExercises();
    while (exercises.length < count) {
      const randomExercise = genericExercises[Math.floor(Math.random() * genericExercises.length)];
      exercises.push(randomExercise);
    }

    return exercises.slice(0, count);
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
   * Dicas genéricas personalizadas
   */
  private getPersonalizedGenericTips(userProfile: UserProfile): GeneratedTip[] {
    return [
      {
        title: "Hidratação Ocular Personalizada",
        description: `${userProfile.name}, mantenha seus olhos hidratados bebendo bastante água e usando colírios lubrificantes quando necessário.`,
        category: "hydration"
      },
      {
        title: "Iluminação Adequada",
        description: "Use sempre iluminação adequada ao ler ou trabalhar. Evite contrastes extremos entre a tela e o ambiente.",
        category: "lighting"
      },
      {
        title: "Pausas Regulares",
        description: `${userProfile.name}, faça pausas regulares durante atividades que exigem foco visual prolongado.`,
        category: "breaks"
      }
    ];
  }

  /**
   * Exercícios genéricos
   */
  private getGenericExercises(): GeneratedExercise[] {
    return [
      {
        title: "Piscar Consciente",
        description: "Exercício simples para lubrificar os olhos",
        instructions: [
          "Pisque lentamente 20 vezes",
          "Mantenha os olhos fechados por 2 segundos a cada piscada",
          "Repita 3 vezes ao dia"
        ],
        duration: 2,
        category: "lubrication"
      },
      {
        title: "Movimentos Oculares",
        description: "Fortalece os músculos oculares",
        instructions: [
          "Olhe para cima por 3 segundos",
          "Olhe para baixo por 3 segundos",
          "Olhe para esquerda por 3 segundos",
          "Olhe para direita por 3 segundos",
          "Repita 5 vezes"
        ],
        duration: 4,
        category: "eye_movement"
      }
    ];
  }
}
