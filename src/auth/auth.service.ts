import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
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

    // Criar o usuário
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        birthDate,
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
    const isPasswordValid = await bcrypt.compare(password, user.password);

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
}
