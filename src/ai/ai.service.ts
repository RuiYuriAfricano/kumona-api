import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import * as FormData from 'form-data';

export interface EyeAnalysisResult {
  condition: string;
  severity: 'low' | 'medium' | 'high';
  score: number;
  description: string;
  recommendations: string[];
  confidence?: number; // 0-1
  analysisDetails?: {
    detectedFeatures: string[];
    riskFactors: string[];
    healthIndicators: string[];
  };
  provider?: string; // Nome do provedor de IA usado
}

export interface AIProviderConfig {
  name: string;
  url: string;
  apiKey: string;
  enabled: boolean;
  timeout: number;
  priority: number; // Ordem de prioridade (menor = maior prioridade)
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly providers: AIProviderConfig[];
  private readonly isDevelopment: boolean;
  private readonly fallbackToSimulation: boolean;

  constructor(private configService: ConfigService) {
    this.isDevelopment = this.configService.get<string>('environment') !== 'production';
    this.fallbackToSimulation = this.configService.get<boolean>('ai.fallbackToSimulation', true);

    // Configurar múltiplos provedores de IA ordenados por prioridade
    this.providers = [
      {
        name: 'OpenAI Vision',
        url: this.configService.get<string>('ai.openai.url', 'https://api.openai.com/v1/chat/completions'),
        apiKey: this.configService.get<string>('ai.openai.apiKey'),
        enabled: !!this.configService.get<string>('ai.openai.apiKey'),
        timeout: 30000,
        priority: 1,
      },
      {
        name: 'Google Vision AI',
        url: this.configService.get<string>('ai.google.url', 'https://vision.googleapis.com/v1/images:annotate'),
        apiKey: this.configService.get<string>('ai.google.apiKey'),
        enabled: !!this.configService.get<string>('ai.google.apiKey'),
        timeout: 25000,
        priority: 2,
      },
      {
        name: 'Azure Computer Vision',
        url: this.configService.get<string>('ai.azure.url'),
        apiKey: this.configService.get<string>('ai.azure.apiKey'),
        enabled: !!this.configService.get<string>('ai.azure.apiKey'),
        timeout: 20000,
        priority: 3,
      },
      {
        name: 'Custom Medical AI',
        url: this.configService.get<string>('ai.custom.url'),
        apiKey: this.configService.get<string>('ai.custom.apiKey'),
        enabled: !!this.configService.get<string>('ai.custom.url'), // Habilitar se URL estiver configurada
        timeout: 35000,
        priority: 1, // Prioridade mais alta para usar o modelo treinado primeiro
      }
    ]
    .filter(provider => provider.enabled)
    .sort((a, b) => a.priority - b.priority);

    this.logger.log(`Inicializado com ${this.providers.length} provedores de IA ativos`);
    if (this.providers.length === 0) {
      this.logger.warn('Nenhum provedor de IA configurado. Usando apenas simulação.');
    } else {
      this.logger.log(`Provedores disponíveis: ${this.providers.map(p => p.name).join(', ')}`);
    }
  }

  async analyzeEyeImage(imagePath: string): Promise<EyeAnalysisResult> {
    // Se não há provedores configurados ou estamos forçando simulação
    if (this.providers.length === 0 || (this.isDevelopment && this.fallbackToSimulation)) {
      this.logger.log('Usando simulação de IA');
      return this.simulateAIAnalysis();
    }

    // Tentar cada provedor em ordem de prioridade
    for (const provider of this.providers) {
      try {
        this.logger.log(`Tentando análise com ${provider.name}`);
        const result = await this.analyzeWithProvider(provider, imagePath);

        if (result) {
          result.provider = provider.name;
          this.logger.log(`Análise bem-sucedida com ${provider.name}`);
          return result;
        }
      } catch (error) {
        this.logger.warn(`Falha na análise com ${provider.name}: ${error.message}`);
        // Continuar para o próximo provedor
      }
    }

    // Se todos os provedores falharam
    if (this.fallbackToSimulation) {
      this.logger.warn('Todos os provedores falharam. Usando simulação como fallback.');
      return this.simulateAIAnalysis();
    }

    throw new ServiceUnavailableException(
      'Não foi possível analisar a imagem com nenhum provedor de IA. Tente novamente mais tarde.',
    );
  }

  private async analyzeWithProvider(provider: AIProviderConfig, imagePath: string): Promise<EyeAnalysisResult | null> {
    try {
      // Verificar se o arquivo existe
      if (!fs.existsSync(imagePath)) {
        throw new Error('Arquivo de imagem não encontrado');
      }

      let result: EyeAnalysisResult;

      switch (provider.name) {
        case 'OpenAI Vision':
          result = await this.analyzeWithOpenAI(provider, imagePath);
          break;
        case 'Google Vision AI':
          result = await this.analyzeWithGoogleVision(provider, imagePath);
          break;
        case 'Azure Computer Vision':
          result = await this.analyzeWithAzureVision(provider, imagePath);
          break;
        case 'Custom Medical AI':
          result = await this.analyzeWithCustomAI(provider, imagePath);
          break;
        default:
          throw new Error(`Provedor não suportado: ${provider.name}`);
      }

      // Validar resultado
      if (!result || !result.condition || !result.severity || typeof result.score !== 'number') {
        throw new Error('Resultado inválido do provedor de IA');
      }

      return result;
    } catch (error) {
      this.logger.error(`Erro na análise com ${provider.name}: ${error.message}`);
      throw error;
    }
  }

  // Métodos específicos para cada provedor de IA
  private async analyzeWithOpenAI(provider: AIProviderConfig, imagePath: string): Promise<EyeAnalysisResult> {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const response = await axios.post(
      provider.url,
      {
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analise esta imagem ocular e forneça um diagnóstico médico detalhado. Retorne apenas um JSON com os campos: condition, severity (low/medium/high), score (0-100), description, recommendations (array), confidence (0-1).'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: provider.timeout,
      }
    );

    const content = response.data.choices[0].message.content;
    return JSON.parse(content);
  }

  private async analyzeWithGoogleVision(provider: AIProviderConfig, imagePath: string): Promise<EyeAnalysisResult> {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const response = await axios.post(
      `${provider.url}?key=${provider.apiKey}`,
      {
        requests: [
          {
            image: {
              content: base64Image
            },
            features: [
              { type: 'LABEL_DETECTION', maxResults: 10 },
              { type: 'TEXT_DETECTION' },
              { type: 'SAFE_SEARCH_DETECTION' }
            ]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: provider.timeout,
      }
    );

    // Processar resposta do Google Vision e converter para nosso formato
    const labels = response.data.responses[0].labelAnnotations || [];
    return this.processGoogleVisionResponse(labels);
  }

  private async analyzeWithAzureVision(provider: AIProviderConfig, imagePath: string): Promise<EyeAnalysisResult> {
    const imageBuffer = fs.readFileSync(imagePath);

    const response = await axios.post(
      `${provider.url}/vision/v3.2/analyze?visualFeatures=Categories,Description,Objects`,
      imageBuffer,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': provider.apiKey,
          'Content-Type': 'application/octet-stream',
        },
        timeout: provider.timeout,
      }
    );

    // Processar resposta do Azure e converter para nosso formato
    return this.processAzureVisionResponse(response.data);
  }

  private async analyzeWithCustomAI(provider: AIProviderConfig, imagePath: string): Promise<EyeAnalysisResult> {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(imagePath));

    // Para a API ai-kumona-classifier, o endpoint é /predict
    const predictUrl = provider.url.endsWith('/predict') ? provider.url : `${provider.url}/predict`;

    const response = await axios.post(predictUrl, formData, {
      headers: {
        ...formData.getHeaders(),
        // A API ai-kumona-classifier não requer Authorization header por padrão
        // 'Authorization': `Bearer ${provider.apiKey}`,
      },
      timeout: provider.timeout,
    });

    // Converter resposta da API ai-kumona-classifier para nosso formato
    return this.processKumonaClassifierResponse(response.data);
  }

  private processKumonaClassifierResponse(data: any): EyeAnalysisResult {
    // Manter as classes em inglês para consistência no banco de dados
    // O mapeamento para português será feito apenas no frontend
    const classMapping = {
      'normal': 'normal',
      'cataract': 'cataract',
      'diabetic_retinopathy': 'diabetic_retinopathy',
      'glaucoma': 'glaucoma'
    };

    // Mapear severidade baseada na confiança
    const confidence = data.confidence || 0;
    let severity: 'low' | 'medium' | 'high' = 'low';

    if (confidence > 0.8) {
      severity = 'high';
    } else if (confidence > 0.6) {
      severity = 'medium';
    }

    // Se não for normal, aumentar a severidade
    if (data.predicted_class !== 'normal') {
      severity = confidence > 0.7 ? 'high' : 'medium';
    }

    const condition = classMapping[data.predicted_class] || data.predicted_class;
    const score = Math.round(confidence * 100); // Confidence em porcentagem

    // Gerar recomendações baseadas na condição detectada
    let recommendations = [];
    let description = '';

    switch (data.predicted_class) {
      case 'normal':
        description = 'Análise indica olhos saudáveis. Continue mantendo bons hábitos de cuidado ocular.';
        recommendations = [
          'Continue fazendo pausas regulares durante o uso de telas',
          'Mantenha uma dieta rica em vitaminas A, C e E',
          'Use óculos de sol com proteção UV',
          'Realize exames oftalmológicos anuais'
        ];
        break;
      case 'cataract':
        description = 'Possíveis sinais de catarata detectados. Recomenda-se avaliação oftalmológica.';
        recommendations = [
          'Consulte um oftalmologista imediatamente',
          'Evite exposição excessiva à luz solar',
          'Mantenha controle de diabetes se aplicável',
          'Considere cirurgia se recomendado pelo médico'
        ];
        break;
      case 'diabetic_retinopathy':
        description = 'Sinais de retinopatia diabética detectados. Atenção médica urgente é necessária.';
        recommendations = [
          'Procure um oftalmologista especialista em retina urgentemente',
          'Mantenha controle rigoroso da glicemia',
          'Monitore pressão arterial regularmente',
          'Siga rigorosamente o tratamento para diabetes'
        ];
        break;
      case 'glaucoma':
        description = 'Possíveis sinais de glaucoma detectados. Avaliação oftalmológica é essencial.';
        recommendations = [
          'Consulte um oftalmologista especialista em glaucoma',
          'Monitore pressão intraocular regularmente',
          'Evite atividades que aumentem pressão ocular',
          'Siga tratamento prescrito rigorosamente'
        ];
        break;
      default:
        description = `Condição detectada: ${condition}. Recomenda-se avaliação profissional.`;
        recommendations = [
          'Consulte um oftalmologista para avaliação detalhada',
          'Monitore sintomas e mudanças na visão',
          'Mantenha hábitos saudáveis de cuidado ocular'
        ];
    }

    return {
      condition,
      severity,
      score,
      description,
      recommendations,
      confidence,
      analysisDetails: {
        detectedFeatures: [data.predicted_class],
        riskFactors: data.predicted_class !== 'normal' ? ['Condição ocular detectada'] : [],
        healthIndicators: data.all_predictions ? Object.keys(data.all_predictions) : []
      },
      provider: 'Kumona AI Classifier'
    };
  }

  // Métodos auxiliares para processar respostas
  private processGoogleVisionResponse(labels: any[]): EyeAnalysisResult {
    // Lógica simplificada - em produção seria mais sofisticada
    const eyeRelatedLabels = labels.filter(label =>
      label.description.toLowerCase().includes('eye') ||
      label.description.toLowerCase().includes('medical') ||
      label.description.toLowerCase().includes('health')
    );

    return {
      condition: eyeRelatedLabels.length > 0 ? 'Análise baseada em características visuais' : 'Olhos saudáveis',
      severity: 'low',
      score: Math.floor(Math.random() * 30) + 70, // 70-100
      description: 'Análise realizada com Google Vision AI',
      recommendations: ['Consulte um oftalmologista para avaliação detalhada'],
      confidence: 0.8,
    };
  }

  private processAzureVisionResponse(data: any): EyeAnalysisResult {
    // Lógica simplificada - em produção seria mais sofisticada
    const description = data.description?.captions?.[0]?.text || '';

    return {
      condition: description.includes('eye') ? 'Características oculares detectadas' : 'Olhos saudáveis',
      severity: 'low',
      score: Math.floor(Math.random() * 30) + 70, // 70-100
      description: 'Análise realizada com Azure Computer Vision',
      recommendations: ['Consulte um oftalmologista para avaliação detalhada'],
      confidence: 0.75,
    };
  }

  // Método para simular análise de IA (usado em desenvolvimento)
  private async simulateAIAnalysis(): Promise<EyeAnalysisResult> {
    // Simular um atraso de processamento
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Gerar um resultado aleatório para demonstração
    const conditions = [
      'Olhos saudáveis',
      'Leve ressecamento ocular',
      'Fadiga ocular',
      'Conjuntivite leve',
      'Sinais de miopia',
      'Olho seco moderado',
    ];

    const severities = ['low', 'medium', 'high'] as const;

    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const score = Math.floor(Math.random() * 101); // 0-100

    // Gerar descrição e recomendações baseadas na condição
    let description = '';
    let recommendations = [];
    let detectedFeatures = [];
    let riskFactors = [];
    let healthIndicators = [];

    switch (condition) {
      case 'Olhos saudáveis':
        description = 'Seus olhos apresentam boa saúde geral. Continue mantendo bons hábitos de cuidado ocular.';
        recommendations = [
          'Continue fazendo pausas regulares durante o uso de telas',
          'Mantenha uma dieta rica em vitaminas A, C e E',
          'Use óculos de sol com proteção UV quando ao ar livre',
          'Realize exames oftalmológicos anuais'
        ];
        detectedFeatures = ['Córnea clara', 'Pupila responsiva', 'Esclera saudável'];
        healthIndicators = ['Boa hidratação ocular', 'Ausência de vermelhidão', 'Reflexos normais'];
        break;
      case 'Leve ressecamento ocular':
        description = 'Detectamos sinais de ressecamento ocular leve. Isso é comum em pessoas que passam muito tempo em frente a telas.';
        recommendations = [
          'Use colírio lubrificante sem conservantes',
          'Aumente a frequência de piscadas',
          'Mantenha umidade adequada no ambiente',
          'Faça pausas mais frequentes durante o trabalho'
        ];
        detectedFeatures = ['Superfície ocular irregular', 'Redução do filme lacrimal'];
        riskFactors = ['Uso prolongado de telas', 'Ambiente seco'];
        break;
      case 'Fadiga ocular':
        description = 'Sinais de fadiga ocular detectados. Recomendamos ajustes na rotina de trabalho e descanso.';
        recommendations = [
          'Aplique a regra 20-20-20 rigorosamente',
          'Ajuste o brilho e contraste da tela',
          'Considere usar filtro de luz azul',
          'Realize exercícios oculares diariamente'
        ];
        detectedFeatures = ['Tensão muscular ocular', 'Leve vermelhidão'];
        riskFactors = ['Trabalho prolongado em telas', 'Iluminação inadequada'];
        break;
      default:
        description = `Identificamos possíveis sinais de ${condition}.`;
        recommendations = [
          'Consulte um oftalmologista para avaliação detalhada',
          'Mantenha uma dieta saudável rica em vitaminas A, C e E',
          'Faça pausas regulares ao usar dispositivos eletrônicos',
          'Monitore sintomas e procure ajuda se piorarem'
        ];
        detectedFeatures = ['Características visuais detectadas'];
        riskFactors = ['Requer avaliação profissional'];
    }

    return {
      condition,
      severity,
      score,
      description,
      recommendations,
      confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
      analysisDetails: {
        detectedFeatures,
        riskFactors,
        healthIndicators,
      },
      provider: 'Simulação de IA',
    };
  }

  // Método público para verificar status dos provedores
  getProvidersStatus(): { name: string; enabled: boolean; priority: number }[] {
    return this.providers.map(provider => ({
      name: provider.name,
      enabled: provider.enabled,
      priority: provider.priority,
    }));
  }

  // Método público para verificar se está usando simulação
  isUsingSimulation(): boolean {
    return this.providers.length === 0 || (this.isDevelopment && this.fallbackToSimulation);
  }

  // Validar se a imagem é de fundoscopia usando Gemini
  async validateFundoscopyImage(base64Image: string): Promise<{
    isValid: boolean;
    reason: string;
    confidence: number;
  }> {
    try {
      this.logger.log('Validando imagem de fundoscopia com Gemini');

      // Configuração do Gemini para validação
      const geminiApiKey = this.configService.get<string>('GEMINI_API_KEY');

      if (!geminiApiKey) {
        this.logger.warn('GEMINI_API_KEY não configurada, permitindo imagem');
        return {
          isValid: true,
          reason: 'Validação não disponível',
          confidence: 0
        };
      }

      const prompt = `
        Analise esta imagem e determine se é uma imagem de fundoscopia (exame do fundo do olho).

        Uma imagem de fundoscopia deve mostrar:
        - O disco óptico (nervo óptico)
        - Vasos sanguíneos da retina
        - A mácula
        - Fundo avermelhado/alaranjado típico da retina

        Responda APENAS no formato JSON:
        {
          "isValid": true/false,
          "reason": "explicação breve",
          "confidence": 0.0-1.0
        }
      `;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Image
                }
              }
            ]
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000
        }
      );

      const result = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!result) {
        throw new Error('Resposta inválida do Gemini');
      }

      // Extrair JSON da resposta
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON não encontrado na resposta');
      }

      const validation = JSON.parse(jsonMatch[0]);

      this.logger.log('Validação de fundoscopia concluída', {
        isValid: validation.isValid,
        confidence: validation.confidence,
        reason: validation.reason
      });

      return {
        isValid: validation.isValid || false,
        reason: validation.reason || 'Análise inconclusiva',
        confidence: validation.confidence || 0
      };

    } catch (error) {
      this.logger.error('Erro na validação de fundoscopia com Gemini', error);

      // Verificar se é erro de quota
      if (error.response?.status === 429) {
        this.logger.warn('Quota do Gemini excedida, pulando validação de fundoscopia');
        return {
          isValid: true,
          reason: 'Validação indisponível (quota excedida), prosseguindo com análise',
          confidence: 0
        };
      }

      // Em caso de outros erros, permitir prosseguir
      return {
        isValid: true,
        reason: 'Erro na validação, prosseguindo com análise',
        confidence: 0
      };
    }
  }
}
