import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

// Interfaces para tipos de dados
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  birthDate: Date;
  medicalHistory: {
    existingConditions: string[];
    familyHistory: string[];
    medications: string[];
  };
  diagnoses: Array<{
    condition: string;
    severity: string;
    date: Date;
  }>;
}

export interface GeneratedTip {
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  iconType: string;
}

export interface GeneratedExercise {
  title: string;
  description: string;
  instructions: string[];
  duration: number;
  category: string;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly isEnabled: boolean;

  constructor(private configService: ConfigService) {
    // Usar API key do Gemini do arquivo .env
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
    this.isEnabled = !!this.apiKey;

    if (this.isEnabled) {
      this.logger.log('✅ Gemini service initialized successfully');
    } else {
      this.logger.warn('⚠️ Gemini API key not found. AI features will use fallback logic.');
    }
  }

  /**
   * Verifica se o serviço Gemini está disponível
   */
  isAvailable(): boolean {
    return this.isEnabled;
  }

  /**
   * Gera dicas personalizadas usando Gemini
   */
  async generatePersonalizedTips(userProfile: UserProfile, count: number = 5): Promise<GeneratedTip[]> {
    if (!this.isEnabled) {
      throw new Error('Gemini service not available');
    }

    try {
      this.logger.log(`🤖 [Gemini] Gerando ${count} dicas personalizadas para ${userProfile.name} (ID: ${userProfile.id})`);

      const age = this.calculateAge(userProfile.birthDate);
      const prompt = this.buildTipsPrompt(userProfile, age, count);

      const response = await axios.post(
        `${this.baseUrl}?key=${this.apiKey}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000
        }
      );

      let content = response.data.candidates[0].content.parts[0].text;

      // Limpar markdown se presente (```json ... ```)
      content = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();

      const parsedResponse = JSON.parse(content);

      this.logger.log(`✅ [Gemini] ${parsedResponse.tips.length} dicas geradas com sucesso para ${userProfile.name}`);
      return parsedResponse.tips;

    } catch (error) {
      this.logger.error(`❌ [Gemini] Erro ao gerar dicas para ${userProfile.name}:`, error);
      throw error;
    }
  }

  /**
   * Gera exercícios personalizados usando Gemini
   */
  async generatePersonalizedExercises(userProfile: UserProfile, count: number = 3): Promise<GeneratedExercise[]> {
    if (!this.isEnabled) {
      throw new Error('Gemini service not available');
    }

    try {
      this.logger.log(`🤖 [Gemini] Gerando ${count} exercícios personalizados para ${userProfile.name} (ID: ${userProfile.id})`);

      const age = this.calculateAge(userProfile.birthDate);
      const prompt = this.buildExercisesPrompt(userProfile, age, count);

      const response = await axios.post(
        `${this.baseUrl}?key=${this.apiKey}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.6,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1500,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000
        }
      );

      let content = response.data.candidates[0].content.parts[0].text;

      // Limpar markdown se presente (```json ... ```)
      content = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();

      const parsedResponse = JSON.parse(content);

      this.logger.log(`✅ [Gemini] ${parsedResponse.exercises.length} exercícios gerados com sucesso para ${userProfile.name}`);
      return parsedResponse.exercises;

    } catch (error) {
      this.logger.error(`❌ [Gemini] Erro ao gerar exercícios para ${userProfile.name}:`, error);
      throw error;
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
   * Constrói prompt para geração de dicas
   */
  private buildTipsPrompt(userProfile: UserProfile, age: number, count: number): string {
    const conditions = userProfile.medicalHistory.existingConditions.join(', ') || 'Nenhuma';
    const familyHistory = userProfile.medicalHistory.familyHistory.join(', ') || 'Nenhum histórico familiar';
    const medications = userProfile.medicalHistory.medications.join(', ') || 'Nenhuma medicação';
    const recentDiagnoses = userProfile.diagnoses?.slice(0, 2).map(d => d.condition).join(', ') || 'Nenhum diagnóstico recente';

    return `Você é um especialista em saúde ocular e oftalmologia. Gere ${count} dicas personalizadas de prevenção e cuidados oculares para o seguinte perfil:

PERFIL DO USUÁRIO:
- Nome: ${userProfile.name}
- Idade: ${age} anos
- Condições existentes: ${conditions}
- Histórico familiar: ${familyHistory}
- Medicações: ${medications}
- Diagnósticos recentes: ${recentDiagnoses}

INSTRUÇÕES:
1. Crie dicas práticas, específicas e baseadas em evidências científicas
2. Use linguagem acessível e amigável
3. Considere a idade e condições específicas do usuário
4. Inclua dicas preventivas e de manutenção da saúde ocular
5. Varie as categorias: higiene, exercícios, alimentação, ambiente, tecnologia

FORMATO DE RESPOSTA (JSON válido):
{
  "tips": [
    {
      "title": "Título da dica",
      "description": "Descrição detalhada da dica",
      "category": "higiene|exercicios|alimentacao|ambiente|tecnologia",
      "priority": "low|medium|high",
      "iconType": "eye|shield|sun|water|food|exercise|tech"
    }
  ]
}

Responda APENAS com o JSON válido, sem texto adicional.`;
  }

  /**
   * Constrói prompt para geração de exercícios
   */
  private buildExercisesPrompt(userProfile: UserProfile, age: number, count: number): string {
    const conditions = userProfile.medicalHistory.existingConditions.join(', ') || 'Nenhuma';
    const recentDiagnoses = userProfile.diagnoses?.slice(0, 2).map(d => d.condition).join(', ') || 'Nenhum diagnóstico recente';

    return `Você é um fisioterapeuta especializado em exercícios oculares e um oftalmologista experiente. Crie ${count} exercícios seguros e eficazes para saúde ocular baseados no seguinte perfil:

PERFIL DO USUÁRIO:
- Nome: ${userProfile.name}
- Idade: ${age} anos
- Condições existentes: ${conditions}
- Diagnósticos recentes: ${recentDiagnoses}

INSTRUÇÕES:
1. Crie exercícios seguros e apropriados para a idade
2. Considere as condições médicas existentes
3. Inclua instruções claras e passo a passo
4. Varie os tipos: relaxamento, fortalecimento, coordenação
5. Defina duração realista (1-10 minutos)

FORMATO DE RESPOSTA (JSON válido):
{
  "exercises": [
    {
      "title": "Nome do exercício",
      "description": "Descrição dos benefícios",
      "instructions": ["Passo 1", "Passo 2", "Passo 3"],
      "duration": 5,
      "category": "relaxamento|fortalecimento|coordenacao|foco"
    }
  ]
}

Responda APENAS com o JSON válido, sem texto adicional.`;
  }
}
