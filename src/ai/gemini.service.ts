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
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
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
            maxOutputTokens: 4096, // Aumentado para evitar truncamento
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000
        }
      );

      // Verificar se a resposta tem a estrutura esperada
      if (!response.data?.candidates?.[0]) {
        this.logger.error('Resposta do Gemini sem estrutura esperada:', JSON.stringify(response.data, null, 2));
        throw new Error('Resposta inválida do Gemini - estrutura inesperada');
      }

      const candidate = response.data.candidates[0];

      // Verificar se a resposta foi truncada por MAX_TOKENS
      if (candidate.finishReason === 'MAX_TOKENS') {
        this.logger.warn('⚠️ [Gemini] Resposta truncada por MAX_TOKENS, tentando processar conteúdo parcial');
      }

      // Verificar se há conteúdo disponível
      if (!candidate.content?.parts?.[0]?.text) {
        this.logger.error('Resposta do Gemini sem conteúdo de texto:', JSON.stringify(response.data, null, 2));
        throw new Error('Resposta inválida do Gemini - sem conteúdo de texto');
      }

      let content = candidate.content.parts[0].text;
      this.logger.debug(`Conteúdo bruto do Gemini (dicas): ${content.substring(0, 200)}...`);

      // Limpar markdown se presente (```json ... ```)
      content = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();

      // Extrair JSON válido da resposta
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.error('Conteúdo da resposta do Gemini (dicas):', content);
        throw new Error('Nenhum JSON válido encontrado na resposta');
      }

      let parsedResponse: any;
      try {
        // Tentar limpar JSON malformado
        let cleanJson = jsonMatch[0];
        // Remover vírgulas extras antes de } ou ]
        cleanJson = cleanJson.replace(/,(\s*[}\]])/g, '$1');
        // Remover quebras de linha dentro de strings
        cleanJson = cleanJson.replace(/\n/g, ' ');

        parsedResponse = JSON.parse(cleanJson);
      } catch (parseError) {
        this.logger.error('Erro ao fazer parse do JSON do Gemini (dicas):', parseError);
        this.logger.error('JSON problemático:', jsonMatch[0]);

        // Se foi truncado por MAX_TOKENS, tentar usar fallback
        if (candidate.finishReason === 'MAX_TOKENS') {
          this.logger.warn('⚠️ [Gemini] JSON truncado por MAX_TOKENS, usando fallback');
          throw new Error('Resposta truncada do Gemini - usando fallback');
        }

        throw new Error(`Erro no parse JSON: ${parseError.message}`);
      }

      // Verificar se a resposta tem a estrutura esperada
      if (!parsedResponse.tips || !Array.isArray(parsedResponse.tips)) {
        this.logger.error('Resposta do Gemini sem array de dicas:', parsedResponse);
        throw new Error('Resposta inválida do Gemini - sem array de dicas');
      }

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
            maxOutputTokens: 3072, // Aumentado para evitar truncamento
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000
        }
      );

      // Verificar se a resposta tem a estrutura esperada
      if (!response.data?.candidates?.[0]) {
        this.logger.error('Resposta do Gemini sem estrutura esperada:', JSON.stringify(response.data, null, 2));
        throw new Error('Resposta inválida do Gemini - estrutura inesperada');
      }

      const candidate = response.data.candidates[0];

      // Verificar se a resposta foi truncada por MAX_TOKENS
      if (candidate.finishReason === 'MAX_TOKENS') {
        this.logger.warn('⚠️ [Gemini] Resposta truncada por MAX_TOKENS, tentando processar conteúdo parcial');
      }

      // Verificar se há conteúdo disponível
      if (!candidate.content?.parts?.[0]?.text) {
        this.logger.error('Resposta do Gemini sem conteúdo de texto:', JSON.stringify(response.data, null, 2));
        throw new Error('Resposta inválida do Gemini - sem conteúdo de texto');
      }

      let content = candidate.content.parts[0].text;
      this.logger.debug(`Conteúdo bruto do Gemini (exercícios): ${content.substring(0, 200)}...`);

      // Limpar markdown se presente (```json ... ```)
      content = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();

      // Extrair JSON válido da resposta
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.error('Conteúdo da resposta do Gemini (exercícios):', content);
        throw new Error('Nenhum JSON válido encontrado na resposta');
      }

      let parsedResponse: any;
      try {
        // Tentar limpar JSON malformado
        let cleanJson = jsonMatch[0];

        // Remover vírgulas extras antes de fechamento de arrays/objetos
        cleanJson = cleanJson.replace(/,(\s*[}\]])/g, '$1');
        // Remover quebras de linha dentro de strings
        cleanJson = cleanJson.replace(/\n/g, ' ');
        // Remover caracteres de controle
        cleanJson = cleanJson.replace(/[\x00-\x1F\x7F]/g, '');

        // Tentar fazer parse
        parsedResponse = JSON.parse(cleanJson);
      } catch (parseError) {
        this.logger.error('Erro ao fazer parse do JSON (exercícios):', jsonMatch[0]);

        // Fallback mais robusto: criar exercício básico
        this.logger.warn('Usando fallback para exercícios devido a erro de parse JSON');
        const fallbackExercise = {
          title: "Exercício de Relaxamento Ocular",
          description: "Exercício básico para relaxar os olhos e reduzir a fadiga visual",
          instructions: [
            "Sente-se confortavelmente em uma cadeira",
            "Feche os olhos suavemente por 10 segundos",
            "Abra os olhos e pisque várias vezes",
            "Olhe para um ponto distante por 10 segundos",
            "Repita o processo 3 vezes"
          ],
          duration: 3,
          category: "relaxation"
        };
        parsedResponse = { exercises: [fallbackExercise] };
      }

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

INSTRUÇÕES IMPORTANTES:
1. PRIORIZE SEMPRE as condições dos diagnósticos recentes - se há catarata, glaucoma, retinopatia diabética, etc., as dicas devem ser ESPECÍFICAS para essas condições
2. Para CATARATA: inclua dicas sobre proteção UV, antioxidantes, cirurgia, sintomas a monitorar
3. Para GLAUCOMA: inclua dicas sobre pressão intraocular, exames regulares, medicação
4. Para RETINOPATIA DIABÉTICA: inclua dicas sobre controle glicêmico, exames de fundo de olho
5. Use linguagem acessível e amigável, mas seja específico para a condição diagnosticada
6. Varie as categorias: higiene, exercícios, alimentação, ambiente, tecnologia, tratamento

FORMATO DE RESPOSTA (JSON válido):
{
  "tips": [
    {
      "title": "Título da dica específica para a condição",
      "description": "Descrição detalhada focada na condição diagnosticada",
      "category": "higiene|exercicios|alimentacao|ambiente|tecnologia|tratamento",
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
