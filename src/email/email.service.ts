import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.createTransporter();
  }

  private createTransporter() {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      this.logger.warn('Configurações SMTP não encontradas. Emails não serão enviados.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false, // true para 465, false para outras portas
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verificar conexão
    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error('Erro na configuração SMTP:', error);
      } else {
        this.logger.log('Servidor SMTP configurado com sucesso');
      }
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string, userName?: string, hostUrl?: string): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('Transporter não configurado. Email não enviado.');
      return false;
    }

    // Usar o host fornecido ou fallback para configuração
    const frontendUrl = hostUrl || this.configService.get('FRONTEND_URL', 'http://localhost:5173');
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: {
        name: 'Kumona Vision Care',
        address: this.configService.get<string>('SMTP_USER')
      },
      to: email,
      subject: 'Recuperação de Senha - Kumona Vision Care',
      html: this.getPasswordResetTemplate(userName || 'Usuário', resetUrl, resetToken)
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email de recuperação enviado para ${email}. MessageId: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Erro ao enviar email para ${email}:`, error);
      return false;
    }
  }

  async sendEmailVerificationOtp(email: string, otp: string, userName?: string): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('Transporter não configurado. Email não enviado.');
      return false;
    }

    const mailOptions = {
      from: {
        name: 'Kumona Vision Care',
        address: this.configService.get<string>('SMTP_USER')
      },
      to: email,
      subject: 'Verificação de Email - Kumona Vision Care',
      html: this.getEmailVerificationOtpTemplate(userName || 'Usuário', otp)
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email de verificação com OTP enviado para ${email}. MessageId: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Erro ao enviar email de verificação com OTP para ${email}:`, error);
      return false;
    }
  }

  async sendPasswordResetOtp(email: string, otp: string, userName?: string): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('Transporter não configurado. Email não enviado.');
      return false;
    }

    const mailOptions = {
      from: {
        name: 'Kumona Vision Care',
        address: this.configService.get<string>('SMTP_USER')
      },
      to: email,
      subject: 'Código de Verificação - Kumona Vision Care',
      html: this.getPasswordResetOtpTemplate(userName || 'Usuário', otp)
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email com OTP enviado para ${email}. MessageId: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Erro ao enviar email com OTP para ${email}:`, error);
      return false;
    }
  }

  async sendWelcomeEmail(email: string, userName: string): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('Transporter não configurado. Email não enviado.');
      return false;
    }

    const mailOptions = {
      from: {
        name: 'Kumona Vision Care',
        address: this.configService.get<string>('SMTP_USER')
      },
      to: email,
      subject: 'Bem-vindo ao Kumona Vision Care! 👁️',
      html: this.getWelcomeTemplate(userName)
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email de boas-vindas enviado para ${email}. MessageId: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Erro ao enviar email de boas-vindas para ${email}:`, error);
      return false;
    }
  }

  async sendNotificationEmail(email: string, subject: string, message: string, userName?: string): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('Transporter não configurado. Email não enviado.');
      return false;
    }

    const mailOptions = {
      from: {
        name: 'Kumona Vision Care',
        address: this.configService.get<string>('SMTP_USER')
      },
      to: email,
      subject: `Kumona - ${subject}`,
      html: this.getNotificationTemplate(userName || 'Usuário', subject, message)
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email de notificação enviado para ${email}. MessageId: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Erro ao enviar notificação para ${email}:`, error);
      return false;
    }
  }

  private getEmailVerificationOtpTemplate(userName: string, otp: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verificação de Email - Kumona</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 3px dashed #667eea; padding: 30px; text-align: center; border-radius: 12px; margin: 25px 0; }
            .otp-code { font-size: 42px; font-weight: bold; letter-spacing: 8px; color: #667eea; font-family: 'Courier New', monospace; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .info { background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✉️ Verificação de Email</h1>
                <p>Kumona Vision Care</p>
            </div>
            <div class="content">
                <h2>Olá, ${userName}!</h2>
                <p>Obrigado por se registrar no Kumona Vision Care! 🎉</p>

                <p>Para completar seu cadastro e ativar sua conta, use o código de verificação abaixo:</p>

                <div class="otp-box">
                    <p style="margin: 0; color: #666; font-size: 14px; margin-bottom: 10px;">SEU CÓDIGO DE VERIFICAÇÃO</p>
                    <div class="otp-code">${otp}</div>
                    <p style="margin: 0; color: #666; font-size: 12px; margin-top: 10px;">Válido por 10 minutos</p>
                </div>

                <div class="info">
                    <strong>ℹ️ Próximos passos:</strong>
                    <ul>
                        <li>Digite o código acima na página de verificação</li>
                        <li>Sua conta será ativada automaticamente</li>
                        <li>Você será redirecionado para a página inicial</li>
                    </ul>
                </div>

                <p>Se você não criou uma conta no Kumona Vision Care, pode ignorar este email com segurança.</p>
            </div>
            <div class="footer">
                <p>© ${new Date().getFullYear()} Kumona Vision Care - Cuidando da sua visão com tecnologia</p>
                <p>Este é um email automático, não responda a esta mensagem.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private getPasswordResetOtpTemplate(userName: string, otp: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Código de Verificação - Kumona</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 3px dashed #667eea; padding: 30px; text-align: center; border-radius: 12px; margin: 25px 0; }
            .otp-code { font-size: 42px; font-weight: bold; letter-spacing: 8px; color: #667eea; font-family: 'Courier New', monospace; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 Código de Verificação</h1>
                <p>Kumona Vision Care</p>
            </div>
            <div class="content">
                <h2>Olá, ${userName}!</h2>
                <p>Recebemos uma solicitação para redefinir a senha da sua conta no Kumona Vision Care.</p>

                <p>Use o código abaixo para verificar sua identidade:</p>

                <div class="otp-box">
                    <p style="margin: 0; color: #666; font-size: 14px; margin-bottom: 10px;">SEU CÓDIGO DE VERIFICAÇÃO</p>
                    <div class="otp-code">${otp}</div>
                    <p style="margin: 0; color: #666; font-size: 12px; margin-top: 10px;">Válido por 10 minutos</p>
                </div>

                <div class="warning">
                    <strong>⚠️ Importante:</strong>
                    <ul>
                        <li>Este código é válido por apenas 10 minutos</li>
                        <li>Se você não solicitou esta alteração, ignore este email</li>
                        <li>Nunca compartilhe este código com outras pessoas</li>
                    </ul>
                </div>

                <p>Se você não solicitou esta recuperação de senha, pode ignorar este email com segurança.</p>
            </div>
            <div class="footer">
                <p>© ${new Date().getFullYear()} Kumona Vision Care - Cuidando da sua visão com tecnologia</p>
                <p>Este é um email automático, não responda a esta mensagem.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private getPasswordResetTemplate(userName: string, resetUrl: string, token: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recuperação de Senha - Kumona</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 Recuperação de Senha</h1>
                <p>Kumona Vision Care</p>
            </div>
            <div class="content">
                <h2>Olá, ${userName}!</h2>
                <p>Recebemos uma solicitação para redefinir a senha da sua conta no Kumona Vision Care.</p>

                <p>Clique no botão abaixo para criar uma nova senha:</p>

                <div style="text-align: center;">
                    <a href="${resetUrl}" class="button">Redefinir Senha</a>
                </div>

                <div class="warning">
                    <strong>⚠️ Importante:</strong>
                    <ul>
                        <li>Este link é válido por apenas 1 hora</li>
                        <li>Se você não solicitou esta alteração, ignore este email</li>
                        <li>Nunca compartilhe este link com outras pessoas</li>
                    </ul>
                </div>

                <p>Se o botão não funcionar, copie e cole este link no seu navegador:</p>
                <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 4px; font-family: monospace;">
                    ${resetUrl}
                </p>

                <p>Se você não solicitou esta recuperação de senha, pode ignorar este email com segurança.</p>
            </div>
            <div class="footer">
                <p>© ${new Date().getFullYear()} Kumona Vision Care - Cuidando da sua visão com tecnologia</p>
                <p>Este é um email automático, não responda a esta mensagem.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private getWelcomeTemplate(userName: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bem-vindo ao Kumona!</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .feature { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #667eea; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>👁️ Bem-vindo ao Kumona!</h1>
                <p>Vision Care - Sua saúde ocular em primeiro lugar</p>
            </div>
            <div class="content">
                <h2>Olá, ${userName}!</h2>
                <p>É um prazer tê-lo conosco! Sua conta foi criada com sucesso e você já pode começar a cuidar da sua saúde ocular.</p>

                <h3>🚀 O que você pode fazer agora:</h3>

                <div class="feature">
                    <h4>🔍 Diagnóstico Inteligente</h4>
                    <p>Use nossa IA avançada para análise inicial dos seus olhos</p>
                </div>

                <div class="feature">
                    <h4>📊 Acompanhamento</h4>
                    <p>Monitore o progresso da sua saúde ocular ao longo do tempo</p>
                </div>

                <div class="feature">
                    <h4>🛡️ Prevenção</h4>
                    <p>Receba dicas personalizadas para manter seus olhos saudáveis</p>
                </div>

                <div class="feature">
                    <h4>🔔 Lembretes</h4>
                    <p>Configure notificações para não esquecer dos cuidados</p>
                </div>

                <p>Estamos aqui para ajudar você a manter uma visão saudável. Se tiver dúvidas, nossa equipe está sempre disponível!</p>
            </div>
            <div class="footer">
                <p>© ${new Date().getFullYear()} Kumona Vision Care - Cuidando da sua visão com tecnologia</p>
                <p>Este é um email automático, não responda a esta mensagem.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private getNotificationTemplate(userName: string, subject: string, message: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject} - Kumona</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔔 ${subject}</h1>
                <p>Kumona Vision Care</p>
            </div>
            <div class="content">
                <h2>Olá, ${userName}!</h2>
                <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
                    ${message}
                </div>
            </div>
            <div class="footer">
                <p>© ${new Date().getFullYear()} Kumona Vision Care - Cuidando da sua visão com tecnologia</p>
                <p>Este é um email automático, não responda a esta mensagem.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }
}
