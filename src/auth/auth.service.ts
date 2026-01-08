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
import { ClinicSignUpDto } from './dto/clinic-signup.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { UserRole, ClinicStatus } from '@prisma/client';

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

    // Gerar código OTP de 6 dígitos
    const otp = this.generateOtp();

    // Definir expiração do OTP (10 minutos a partir de agora)
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

    // Criar o usuário com emailVerified = false
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        birthDate: formattedBirthDate,
        emailVerified: false, // Email não verificado ainda
        otp, // Salvar OTP para verificação
        otpExpiry, // Salvar expiração do OTP
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

    // Enviar email com OTP de verificação
    try {
      const emailSent = await this.emailService.sendEmailVerificationOtp(user.email, otp, user.name);

      if (!emailSent) {
        console.warn('Falha ao enviar email de verificação, mas continuando...');
      }
    } catch (error) {
      console.error('Erro ao enviar email de verificação:', error);
      // Não falhar o registro por causa do email
    }

    // Log para desenvolvimento
    console.log(`OTP de verificação para ${email}: ${otp}`);
    console.log(`OTP expira em: ${otpExpiry.toISOString()}`);

    return {
      success: true,
      message: 'Código de verificação enviado para seu email!',
      email: user.email,
      // Em desenvolvimento, incluir o OTP para facilitar testes
      ...(process.env.NODE_ENV === 'development' && { otp })
    };
  }

  /**
   * Verificar OTP de registro e ativar conta
   */
  async verifyRegistrationOtp(email: string, otp: string) {
    // Buscar usuário pelo email
    const user = await this.prisma.user.findUnique({
      where: { email, deleted: false },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verificar se o email já foi verificado
    if (user.emailVerified) {
      throw new BadRequestException('Email já foi verificado');
    }

    // Verificar se o OTP existe
    if (!user.otp) {
      throw new BadRequestException('Código de verificação não encontrado. Solicite um novo código.');
    }

    // Verificar se o OTP expirou
    if (user.otpExpiry && new Date() > user.otpExpiry) {
      throw new BadRequestException('Código de verificação expirado. Solicite um novo código.');
    }

    // Verificar se o OTP está correto
    if (user.otp !== otp) {
      throw new BadRequestException('Código de verificação inválido');
    }

    // Atualizar usuário: marcar email como verificado e limpar OTP
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        otp: null,
        otpExpiry: null,
      },
      include: {
        medicalHistory: true,
        preferences: true,
      },
    });

    // Enviar email de boas-vindas
    try {
      await this.emailService.sendWelcomeEmail(updatedUser.email, updatedUser.name);
    } catch (error) {
      console.error('Erro ao enviar email de boas-vindas:', error);
    }

    // Criar notificação de boas-vindas
    try {
      await this.notificationsService.createNotification(
        updatedUser.id,
        '🎉 Bem-vindo ao Kumona Vision Care!',
        `Olá ${updatedUser.name}! Sua conta foi criada com sucesso. Explore nossos recursos de diagnóstico e prevenção para cuidar da sua saúde ocular.`,
        'success'
      );
    } catch (error) {
      console.error('Erro ao criar notificação de boas-vindas:', error);
    }

    // Notificar administradores sobre novo usuário
    try {
      await this.notificationsService.notifyAdmins(
        '👤 Novo Utilizador Registado',
        `Um novo utilizador se registou no sistema: ${updatedUser.name} (${updatedUser.email})`,
        'info',
        true,
        'Novo Utilizador - Kumona Vision Care'
      );
    } catch (error) {
      console.error('Erro ao notificar admins sobre novo usuário:', error);
    }

    // Gerar token JWT
    const token = this.generateToken(updatedUser.id, updatedUser.email, updatedUser.role);

    // Remover a senha do objeto de retorno
    const { password: _, ...result } = updatedUser;

    return {
      success: true,
      message: 'Email verificado com sucesso!',
      user: result,
      token,
    };
  }

  async markFirstLoginComplete(userId: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isFirstLogin: false },
    });
  }

  async clinicSignUp(clinicSignUpDto: ClinicSignUpDto) {
    try {
      console.log('🏥 [CLINIC SIGNUP] Dados recebidos:', {
        name: clinicSignUpDto.name,
        email: clinicSignUpDto.email,
        nif: clinicSignUpDto.nif,
        responsibleName: clinicSignUpDto.responsibleName
      });

      const { email, password, name, nif, ...clinicData } = clinicSignUpDto;

      console.log('🔍 [CLINIC SIGNUP] Verificando se email já existe:', email);
      // Verificar se o email já existe
      const userExists = await this.prisma.user.findUnique({
        where: { email },
      });

      if (userExists) {
        console.log('❌ [CLINIC SIGNUP] Email já existe:', email);
        throw new ConflictException('Email já está em uso');
      }

      console.log('🔍 [CLINIC SIGNUP] Verificando se NIF já existe:', nif);
      // Verificar se o NIF já existe (apenas clínicas não deletadas)
      const clinicExists = await this.prisma.clinic.findFirst({
        where: {
          nif,
          deleted: false
        },
      });

      if (clinicExists) {
        console.log('❌ [CLINIC SIGNUP] NIF já existe:', nif);
        throw new ConflictException('NIF já está em uso');
      }

      console.log('🔐 [CLINIC SIGNUP] Gerando hash da senha...');
      // Hash da senha
      const hashedPassword = await bcrypt.hash(password, 10);

    // Criar o usuário primeiro
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        birthDate: new Date('1990-01-01'), // Data padrão para clínicas
        role: UserRole.CLINIC,
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

    // Criar a clínica
    const clinic = await this.prisma.clinic.create({
      data: {
        name,
        nif,
        email,
        userId: user.id,
        status: ClinicStatus.PENDING, // Clínicas criadas via signup ficam pendentes
        ...clinicData,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    const result = { user, clinic };

    // Notificar administradores sobre nova clínica
    try {
      await this.notificationsService.notifyAdmins(
        '🏥 Nova Clínica Registrada',
        `Uma nova clínica se registrou no sistema: ${name} (${email})`,
        'info',
        true,
        'Nova Clínica - Kumona Vision Care'
      );
    } catch (error) {
      console.error('Erro ao notificar admins sobre nova clínica:', error);
    }

    // Enviar notificação de boas-vindas para a clínica
    try {
      console.log('🎉 [CLINIC SIGNUP] Enviando notificação de boas-vindas para a clínica...');
      await this.notificationsService.createNotification(
        user.id,
        '🎉 Bem-vindo ao Kumona Vision Care!',
        `Olá ${name}! Seu registro foi recebido com sucesso e está em análise. Você receberá uma notificação assim que sua clínica for aprovada pelo administrador. Enquanto isso, você pode fazer login no sistema com acesso limitado.`,
        'success',
        true,
        'Bem-vindo ao Kumona Vision Care'
      );
      console.log('✅ [CLINIC SIGNUP] Notificação de boas-vindas enviada com sucesso');
    } catch (error) {
      console.error('❌ [CLINIC SIGNUP] Erro ao enviar notificação de boas-vindas:', error);
    }

    // Enviar email de confirmação para a clínica
    try {
      await this.emailService.sendNotificationEmail(
        email,
        'Registro de Clínica Recebido',
        `Olá ${name}!\n\nSeu registro de clínica foi recebido com sucesso e está em análise.\n\nDetalhes do registro:\n- Nome: ${name}\n- Email: ${email}\n- NIF: ${nif}\n\nVocê receberá uma notificação por email assim que sua clínica for aprovada pelo administrador.\n\nEnquanto isso, você pode fazer login no sistema, mas terá acesso limitado até a aprovação.\n\nObrigado por escolher o Kumona Vision Care!`,
        name
      );
      console.log('✅ [CLINIC SIGNUP] Email de confirmação enviado para a clínica');
    } catch (error) {
      console.error('❌ [CLINIC SIGNUP] Erro ao enviar email de confirmação para a clínica:', error);
    }

    // Gerar token JWT
    const token = this.generateToken(result.user.id, result.user.email, result.user.role);

    // Remover a senha do objeto de retorno
    const { password: _, ...userResult } = result.user;

    return {
      user: userResult,
      clinic: result.clinic,
      token,
      message: 'Clínica registrada com sucesso. Aguarde a aprovação do administrador.',
    };
    } catch (error) {
      console.error('Erro no clinicSignUp:', error);
      throw error;
    }
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Buscar usuário pelo email
    const user = await this.prisma.user.findUnique({
      where: { email, deleted: false },
      include: {
        medicalHistory: true,
        preferences: true,
        clinic: true, // Incluir dados da clínica se for uma clínica
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

    // Verificar se o email foi verificado (apenas para usuários normais, não clínicas)
    if (user.role === UserRole.USER && !user.emailVerified) {
      // Gerar novo código OTP
      const otp = this.generateOtp();

      // Definir expiração do OTP (10 minutos a partir de agora)
      const otpExpiry = new Date();
      otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

      // Atualizar OTP no banco de dados
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          otp,
          otpExpiry,
        },
      });

      // Enviar email com novo OTP
      try {
        await this.emailService.sendEmailVerificationOtp(user.email, otp, user.name);
      } catch (error) {
        console.error('Erro ao enviar email de verificação:', error);
      }

      // Log para desenvolvimento
      console.log(`Novo OTP de verificação para ${email}: ${otp}`);
      console.log(`OTP expira em: ${otpExpiry.toISOString()}`);

      // Lançar exceção com informação de que um novo código foi enviado
      throw new UnauthorizedException(
        JSON.stringify({
          message: 'Email não verificado. Um novo código de verificação foi enviado para seu email.',
          emailNotVerified: true,
          email: user.email,
          // Em desenvolvimento, incluir o OTP para facilitar testes
          ...(process.env.NODE_ENV === 'development' && { otp })
        })
      );
    }

    // Verificar se é uma clínica e validar seu status
    if (user.role === UserRole.CLINIC) {
      console.log(`🏥 [LOGIN] Usuário é uma clínica, verificando status...`);

      if (!user.clinic) {
        console.log(`❌ [LOGIN] Clínica não encontrada para usuário ${user.id}`);
        throw new UnauthorizedException('Clínica não encontrada. Entre em contato com o suporte.');
      }

      console.log(`🏥 [LOGIN] Status da clínica: ${user.clinic.status}`);

      if (user.clinic.status !== ClinicStatus.APPROVED) {
        const statusMessages = {
          [ClinicStatus.PENDING]: 'Sua clínica ainda está em análise. Aguarde a aprovação do administrador.',
          [ClinicStatus.REJECTED]: 'Sua clínica foi rejeitada. Entre em contato com o suporte para mais informações.',
          [ClinicStatus.SUSPENDED]: 'Sua clínica foi suspensa. Entre em contato com o suporte para mais informações.'
        };

        const message = statusMessages[user.clinic.status] || 'Sua clínica não está aprovada para acesso.';
        console.log(`❌ [LOGIN] Clínica com status ${user.clinic.status} tentou fazer login`);
        throw new UnauthorizedException(message);
      }

      console.log(`✅ [LOGIN] Clínica aprovada, permitindo login`);
    }

    // Gerar token JWT
    const token = this.generateToken(user.id, user.email, user.role);

    // Remover a senha do objeto de retorno
    const { password: _, ...result } = user;

    return {
      user: result,
      token,
    };
  }

  private generateToken(userId: number, email: string, role: string): string {
    const payload: JwtPayload = { sub: userId, email, role: role as any };
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

  /**
   * Gerar código OTP de 6 dígitos
   */
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
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

    // Gerar código OTP de 6 dígitos
    const otp = this.generateOtp();

    // Definir expiração do OTP (10 minutos a partir de agora)
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

    // Salvar OTP no banco de dados
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otp,
        otpExpiry,
      },
    });

    // Enviar email com OTP
    try {
      const emailSent = await this.emailService.sendPasswordResetOtp(user.email, otp, user.name);

      if (!emailSent) {
        console.warn('Falha ao enviar email de recuperação, mas continuando...');
      }
    } catch (error) {
      console.error('Erro ao enviar email de recuperação:', error);
      // Em produção, você pode querer falhar aqui
    }

    // Log para desenvolvimento
    console.log(`OTP de recuperação para ${email}: ${otp}`);
    console.log(`OTP expira em: ${otpExpiry.toISOString()}`);

    return {
      success: true,
      message: 'Código de verificação enviado com sucesso!',
      // Em desenvolvimento, incluir o OTP para facilitar testes
      ...(process.env.NODE_ENV === 'development' && { otp })
    };
  }

  /**
   * Verificar código OTP
   */
  async verifyOtp(email: string, otp: string) {
    // Buscar usuário
    const user = await this.prisma.user.findUnique({
      where: { email, deleted: false },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verificar se o OTP existe
    if (!user.otp || !user.otpExpiry) {
      throw new BadRequestException('Nenhum código de verificação foi solicitado para este email');
    }

    // Verificar se o OTP expirou
    if (new Date() > user.otpExpiry) {
      // Limpar OTP expirado
      await this.prisma.user.update({
        where: { id: user.id },
        data: { otp: null, otpExpiry: null },
      });
      throw new BadRequestException('Código de verificação expirado. Solicite um novo código');
    }

    // Verificar se o OTP está correto
    if (user.otp !== otp) {
      throw new BadRequestException('Código de verificação inválido');
    }

    // OTP válido - retornar sucesso
    return {
      success: true,
      message: 'Código verificado com sucesso!',
      email: user.email,
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, otp, newPassword } = resetPasswordDto;

    // Buscar o usuário
    const user = await this.prisma.user.findUnique({
      where: { email, deleted: false },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verificar se o OTP existe
    if (!user.otp || !user.otpExpiry) {
      throw new BadRequestException('Nenhum código de verificação foi solicitado');
    }

    // Verificar se o OTP expirou
    if (new Date() > user.otpExpiry) {
      // Limpar OTP expirado
      await this.prisma.user.update({
        where: { id: user.id },
        data: { otp: null, otpExpiry: null },
      });
      throw new BadRequestException('Código de verificação expirado. Solicite um novo código');
    }

    // Verificar se o OTP está correto
    if (user.otp !== otp) {
      throw new BadRequestException('Código de verificação inválido');
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    console.log(`Atualizando senha para usuário ID: ${user.id}`);
    console.log(`Hash da nova senha: ${hashedPassword.substring(0, 20)}...`);

    // Atualizar a senha e limpar o OTP
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        otp: null,
        otpExpiry: null,
        updatedAt: new Date()
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
    const token = this.generateToken(user.id, user.email, user.role);

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
    const token = this.generateToken(updatedUser.id, updatedUser.email, updatedUser.role);

    // Remover a senha do objeto de retorno
    const { password: _, ...result } = updatedUser;

    return {
      user: result,
      token,
    };
  }

  async googleCallback(code: string) {
    try {
      console.log('🔄 Iniciando googleCallback...');
      console.log('📦 Código recebido:', code?.substring(0, 20) + '...');
      console.log('🔑 Client ID:', process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...');
      console.log('🔐 Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'Configurado' : 'NÃO CONFIGURADO');
      console.log('🌍 NODE_ENV:', process.env.NODE_ENV);

      const redirectUri = process.env.NODE_ENV === 'production'
        ? 'https://kumona-vision-care.netlify.app/auth/google/callback'
        : 'http://localhost:5173/auth/google/callback';

      console.log('🔗 Redirect URI:', redirectUri);

      // Trocar código por token de acesso
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });

      console.log('📡 Status da resposta do Google:', tokenResponse.status, tokenResponse.statusText);

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('❌ Erro do Google OAuth:', errorText);
        throw new BadRequestException(`Falha ao trocar código por token: ${errorText}`);
      }

      const tokenData = await tokenResponse.json();
      console.log('✅ Token recebido do Google:', tokenData.access_token ? 'Sucesso' : 'Falha');

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
