import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, name, birthDate } = registerDto;

    // Verificar se o usuário já existe
    const userExists = await this.prisma.user.findUnique({
      where: { email },
    });

    if (userExists) {
      throw new ConflictException('Email já está em uso');
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Converter a data de nascimento para o formato ISO-8601 DateTime completo
    const formattedBirthDate = new Date(birthDate);

    // Criar o usuário
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        birthDate: formattedBirthDate,
        medicalHistory: {
          create: {
            existingConditions: [],
            familyHistory: [],
            medications: [],
          },
        },
        preferences: {
          create: {
            notificationsEnabled: true,
            reminderFrequency: 'daily',
            language: 'pt',
          },
        },
      },
      include: {
        medicalHistory: true,
        preferences: true,
      },
    });

    // Enviar email de boas-vindas (não bloquear o registro se falhar)
    try {
      await this.emailService.sendWelcomeEmail(user.email, user.name);
    } catch (error) {
      console.error('Erro ao enviar email de boas-vindas:', error);
      // Não falhar o registro por causa do email
    }

    // Criar notificação de boas-vindas
    try {
      await this.notificationsService.createNotification(
        user.id,
        '🎉 Bem-vindo ao Kumona Vision Care!',
        `Olá ${user.name}! Sua conta foi criada com sucesso. Explore nossos recursos de diagnóstico e prevenção para cuidar da sua saúde ocular.`,
        'success'
      );
    } catch (error) {
      console.error('Erro ao criar notificação de boas-vindas:', error);
    }

    // Gerar token JWT
    const token = this.generateToken(user.id, user.email);

    // Remover a senha do objeto de retorno
    const { password: _, ...result } = user;

    return {
      user: result,
      token,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Buscar usuário pelo email
    const user = await this.prisma.user.findUnique({
      where: { email, deleted: false },
      include: {
        medicalHistory: true,
        preferences: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Verificar senha
    console.log(`Tentativa de login para: ${email}`);
    console.log(`Hash armazenado: ${user.password.substring(0, 20)}...`);
    console.log(`Senha fornecida: ${password}`);

    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log(`Senha válida: ${isPasswordValid}`);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Gerar token JWT
    const token = this.generateToken(user.id, user.email);

    // Remover a senha do objeto de retorno
    const { password: _, ...result } = user;

    return {
      user: result,
      token,
    };
  }

  private generateToken(userId: number, email: string): string {
    const payload: JwtPayload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }

  async validateUser(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, deleted: false },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado ou inativo');
    }

    return user;
  }

  async verifyJwt(token: string): Promise<JwtPayload | null> {
    try {
      const payload = this.jwtService.verify(token) as JwtPayload;
      // Verificar se o usuário existe e está ativo
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub, deleted: false },
      });

      if (!user) {
        return null;
      }

      return payload;
    } catch (error) {
      return null;
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto, frontendUrl?: string) {
    const { email } = forgotPasswordDto;

    // Verificar se o usuário existe
    const user = await this.prisma.user.findUnique({
      where: { email, deleted: false },
    });

    if (!user) {
      throw new NotFoundException('Email não encontrado. Verifique se o email está correto ou cadastre-se primeiro.');
    }

    // Gerar token de recuperação (válido por 1 hora)
    const resetToken = this.jwtService.sign(
      { sub: user.id, email: user.email, type: 'password-reset' },
      { expiresIn: '1h' }
    );

    // Enviar email de recuperação
    try {
      const emailSent = await this.emailService.sendPasswordResetEmail(user.email, resetToken, user.name, frontendUrl);

      if (!emailSent) {
        console.warn('Falha ao enviar email de recuperação, mas continuando...');
      }
    } catch (error) {
      console.error('Erro ao enviar email de recuperação:', error);
      // Em produção, você pode querer falhar aqui
    }

    // Log para desenvolvimento
    console.log(`Token de recuperação para ${email}: ${resetToken}`);
    console.log(`Link de recuperação: http://localhost:5173/reset-password?token=${resetToken}`);

    return {
      success: true,
      message: 'Email de recuperação enviado com sucesso!',
      // Em desenvolvimento, incluir o token para facilitar testes
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    try {
      // Verificar e decodificar o token
      const payload = this.jwtService.verify(token) as JwtPayload & { type?: string };

      // Verificar se é um token de reset de senha
      if (payload.type !== 'password-reset') {
        throw new BadRequestException('Token inválido');
      }

      // Buscar o usuário
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub, deleted: false },
      });

      if (!user) {
        throw new NotFoundException('Usuário não encontrado');
      }

      // Hash da nova senha
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      console.log(`Atualizando senha para usuário ID: ${user.id}`);
      console.log(`Hash da nova senha: ${hashedPassword.substring(0, 20)}...`);

      // Atualizar a senha no banco de dados
      const updatedUser = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          updatedAt: new Date() // Forçar atualização do timestamp
        },
      });

      console.log(`Senha atualizada com sucesso para usuário: ${updatedUser.email}`);
      console.log(`Timestamp de atualização: ${updatedUser.updatedAt}`);

      // Enviar notificação de mudança de senha por email
      try {
        await this.emailService.sendNotificationEmail(
          updatedUser.email,
          'Senha da sua conta foi alterada - Kumona',
          `Sua senha foi alterada com sucesso em ${new Date().toLocaleString('pt-BR')}. Se você não fez esta alteração, entre em contato conosco imediatamente.`,
          updatedUser.name
        );
      } catch (emailError) {
        console.error('Erro ao enviar notificação de mudança de senha:', emailError);
      }

      return {
        success: true,
        message: 'Senha redefinida com sucesso!'
      };

    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new BadRequestException('Token inválido ou expirado');
      }
      throw error;
    }
  }

  // Métodos para autenticação com Google
  async googleSignUp(googleAuthDto: GoogleAuthDto) {
    const { googleId, email, name, profileImage } = googleAuthDto;

    // Verificar se o usuário já existe pelo email
    const existingUser = await this.prisma.user.findUnique({
      where: { email, deleted: false },
    });

    if (existingUser) {
      throw new ConflictException('Usuário já existe. Use o login com Google.');
    }

    // Criar novo usuário com dados do Google
    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        profileImage: profileImage || 'https://www.w3schools.com/howto/img_avatar.png',
        password: '', // Senha vazia para usuários do Google
        phone: null, // Será preenchido posteriormente pelo usuário
        birthDate: new Date('1990-01-01'), // Data padrão, pode ser atualizada depois
        about: `Usuário registrado via Google OAuth em ${new Date().toLocaleDateString('pt-BR')}`,
        medicalHistory: {
          create: {
            existingConditions: [],
            familyHistory: [],
            medications: [],
          },
        },
        preferences: {
          create: {
            notificationsEnabled: true,
            reminderFrequency: 'daily',
            language: 'pt',
          },
        },
      },
      include: {
        medicalHistory: true,
        preferences: true,
      },
    });

    // Enviar email de boas-vindas
    try {
      await this.emailService.sendWelcomeEmail(user.email, user.name);
    } catch (error) {
      console.error('Erro ao enviar email de boas-vindas:', error);
    }

    // Criar notificação de boas-vindas
    try {
      await this.notificationsService.createNotification(
        user.id,
        '🎉 Bem-vindo ao Kumona Vision Care!',
        `Olá ${user.name}! Sua conta foi criada com sucesso via Google. Explore nossos recursos de diagnóstico e prevenção para cuidar da sua saúde ocular.`,
        'success'
      );
    } catch (error) {
      console.error('Erro ao criar notificação de boas-vindas:', error);
    }

    // Gerar token JWT
    const token = this.generateToken(user.id, user.email);

    // Remover a senha do objeto de retorno
    const { password: _, ...result } = user;

    return {
      user: result,
      token,
    };
  }

  async googleSignIn(googleAuthDto: GoogleAuthDto) {
    const { email } = googleAuthDto;

    // Verificar se o usuário existe e foi criado via Google (senha vazia)
    const user = await this.prisma.user.findUnique({
      where: { email, deleted: false },
      include: {
        medicalHistory: true,
        preferences: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado. Faça o cadastro primeiro.');
    }

    // Verificar se o usuário foi criado via Google (senha vazia)
    if (user.password !== '') {
      throw new UnauthorizedException('Esta conta foi criada com email/senha. Use o login tradicional.');
    }

    // Atualizar informações do Google se necessário
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        profileImage: googleAuthDto.profileImage || user.profileImage,
        name: googleAuthDto.name || user.name,
      },
      include: {
        medicalHistory: true,
        preferences: true,
      },
    });

    // Gerar token JWT
    const token = this.generateToken(updatedUser.id, updatedUser.email);

    // Remover a senha do objeto de retorno
    const { password: _, ...result } = updatedUser;

    return {
      user: result,
      token,
    };
  }

  async googleCallback(code: string) {
    try {
      // Trocar código por token de acesso
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: '182853359858-2i3blnvc8ob4fsscoaa27top339a1rrd.apps.googleusercontent.com',
          client_secret: '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',
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: process.env.NODE_ENV === 'production'
            ? 'https://kumona-vision-care.netlify.app'
            : 'http://localhost:5173',
        }),
      });

      if (!tokenResponse.ok) {
        throw new BadRequestException('Falha ao trocar código por token');
      }

      const tokenData = await tokenResponse.json();

      // Obter informações do usuário
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (!userResponse.ok) {
        throw new BadRequestException('Falha ao obter dados do usuário');
      }

      const userData = await userResponse.json();

      return {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        picture: userData.picture || '',
        accessToken: tokenData.access_token,
      };
    } catch (error) {
      console.error('Erro no callback do Google:', error);
      throw new BadRequestException('Falha ao processar callback do Google');
    }
  }
}
