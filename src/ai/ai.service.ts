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
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly isDevelopment: boolean;

  constructor(private configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('ai.serviceUrl');
    this.apiKey = this.configService.get<string>('ai.apiKey');
    this.isDevelopment = this.configService.get<string>('environment') !== 'production';
  }

  async analyzeEyeImage(imagePath: string): Promise<EyeAnalysisResult> {
    try {
      // Se estamos em ambiente de desenvolvimento e não temos configuração de API,
      // usamos a simulação
      if (this.isDevelopment && (!this.apiUrl || !this.apiKey)) {
        this.logger.log('Usando simulação de IA em ambiente de desenvolvimento');
        return this.simulateAIAnalysis();
      }

      // Preparar os dados para envio
      const formData = new FormData();
      formData.append('image', fs.createReadStream(imagePath));

      // Fazer a requisição para o serviço de IA
      const response = await axios.post<EyeAnalysisResult>(this.apiUrl, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Erro ao analisar imagem: ${error.message}`, error.stack);
      
      // Se estamos em desenvolvimento, podemos retornar dados simulados em caso de erro
      if (this.isDevelopment) {
        this.logger.warn('Usando dados simulados devido a erro na API');
        return this.simulateAIAnalysis();
      }
      
      throw new ServiceUnavailableException(
        'Não foi possível analisar a imagem. Por favor, tente novamente mais tarde.',
      );
    }
  }

  // Método para simular análise de IA (usado em desenvolvimento)
  private async simulateAIAnalysis(): Promise<EyeAnalysisResult> {
    // Simular um atraso de processamento
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Gerar um resultado aleatório para demonstração
    const conditions = [
      'Catarata',
      'Glaucoma',
      'Retinopatia diabética',
      'Degeneração macular',
      'Olho seco',
      'Conjuntivite',
      'Miopia',
    ];
    
    const severities = ['low', 'medium', 'high'] as const;
    
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const score = Math.floor(Math.random() * 101); // 0-100
    
    // Gerar descrição e recomendações baseadas na condição
    let description = '';
    let recommendations = [];
    
    switch (condition) {
      case 'Catarata':
        description = 'Identificamos sinais de catarata, que é uma opacificação do cristalino do olho.';
        recommendations = [
          'Consulte um oftalmologista para avaliação detalhada',
          'Evite dirigir à noite se tiver dificuldade de visão',
          'Use óculos de sol para reduzir o desconforto com luz intensa',
        ];
        break;
      case 'Glaucoma':
        description = 'Detectamos possíveis sinais de glaucoma, uma condição que afeta o nervo óptico.';
        recommendations = [
          'Consulte um oftalmologista com urgência',
          'Meça sua pressão ocular regularmente',
          'Siga rigorosamente o tratamento prescrito pelo médico',
        ];
        break;
      default:
        description = `Identificamos possíveis sinais de ${condition}.`;
        recommendations = [
          'Consulte um oftalmologista para avaliação detalhada',
          'Mantenha uma dieta saudável rica em vitaminas A, C e E',
          'Faça pausas regulares ao usar dispositivos eletrônicos',
        ];
    }
    
    return {
      condition,
      severity,
      score,
      description,
      recommendations,
    };
  }
}
