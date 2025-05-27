import { Controller, Post, Body, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

class SupportMessageDto {
  name: string;
  email: string;
  subject: string;
  message: string;
}

@ApiTags('help')
@Controller('help')
export class HelpController {
  @Post('support')
  @ApiOperation({ summary: 'Enviar mensagem de suporte' })
  @ApiResponse({ status: 201, description: 'Mensagem enviada com sucesso' })
  @ApiBody({ type: SupportMessageDto })
  async sendSupportMessage(@Body() supportData: SupportMessageDto) {
    // Simular envio de email ou salvamento no banco
    console.log('Mensagem de suporte recebida:', supportData);
    
    // Aqui você poderia integrar com um serviço de email como SendGrid, Nodemailer, etc.
    // Ou salvar no banco de dados para análise posterior
    
    return {
      success: true,
      message: 'Sua mensagem foi enviada com sucesso! Nossa equipe entrará em contato em breve.',
      ticketId: `TICKET-${Date.now()}`,
      estimatedResponse: '24-48 horas'
    };
  }

  @Get('faq')
  @ApiOperation({ summary: 'Obter perguntas frequentes' })
  @ApiResponse({ status: 200, description: 'FAQ retornado com sucesso' })
  getFAQ() {
    return {
      categories: [
        {
          title: 'Diagnóstico',
          questions: [
            {
              question: 'Como funciona o diagnóstico com IA?',
              answer: 'Nossa IA analisa imagens dos seus olhos para detectar possíveis problemas oculares. O processo é rápido e não invasivo.'
            },
            {
              question: 'O diagnóstico substitui uma consulta médica?',
              answer: 'Não. Nosso diagnóstico é apenas uma triagem inicial. Sempre consulte um oftalmologista para diagnósticos definitivos.'
            }
          ]
        },
        {
          title: 'Prevenção',
          questions: [
            {
              question: 'Com que frequência devo fazer exercícios oculares?',
              answer: 'Recomendamos fazer exercícios oculares diariamente, especialmente se você passa muito tempo em frente a telas.'
            }
          ]
        }
      ]
    };
  }

  @Get('contact')
  @ApiOperation({ summary: 'Obter informações de contato' })
  @ApiResponse({ status: 200, description: 'Informações de contato retornadas com sucesso' })
  getContactInfo() {
    return {
      support: {
        email: 'suporte@kumona.ao',
        phone: '+244 900 000 000',
        whatsapp: '+244 900 000 000',
        hours: 'Segunda a Sexta, 8h às 18h'
      },
      emergency: {
        phone: '+244 911 000 000',
        description: 'Para emergências oculares graves'
      },
      address: {
        street: 'Rua da Saúde, 123',
        city: 'Luanda',
        country: 'Angola',
        zipCode: '1000-001'
      },
      social: {
        facebook: 'https://facebook.com/kumona',
        instagram: 'https://instagram.com/kumona',
        twitter: 'https://twitter.com/kumona'
      }
    };
  }
}
