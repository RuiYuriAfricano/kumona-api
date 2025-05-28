import { Controller, Post, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar novo usuário', description: 'Cria uma nova conta de usuário no sistema' })
  @ApiBody({ type: RegisterDto, description: 'Dados de registro do usuário' })
  @ApiResponse({ status: 201, description: 'Usuário registrado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos' })
  @ApiResponse({ status: 409, description: 'Email já está em uso' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login de usuário', description: 'Autentica um usuário e retorna um token JWT' })
  @ApiBody({ type: LoginDto, description: 'Credenciais de login' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Solicitar recuperação de senha',
    description: 'Envia um email com link para redefinir a senha'
  })
  @ApiBody({ type: ForgotPasswordDto, description: 'Email para recuperação' })
  @ApiResponse({ status: 200, description: 'Email de recuperação enviado com sucesso' })
  @ApiResponse({ status: 404, description: 'Email não encontrado' })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto, @Req() req: Request) {
    // Usar URL do frontend baseada no ambiente
    let frontendUrl: string;

    if (process.env.NODE_ENV === 'production') {
      // Em produção, usar a URL do Netlify
      frontendUrl = 'https://kumona-vision-care.netlify.app';
    } else {
      // Em desenvolvimento, usar localhost
      frontendUrl = 'http://localhost:5173';
    }

    return this.authService.forgotPassword(forgotPasswordDto, frontendUrl);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Redefinir senha',
    description: 'Redefine a senha do usuário usando o token de recuperação'
  })
  @ApiBody({ type: ResetPasswordDto, description: 'Token e nova senha' })
  @ApiResponse({ status: 200, description: 'Senha redefinida com sucesso' })
  @ApiResponse({ status: 400, description: 'Token inválido ou expirado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('google/signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Cadastro com Google',
    description: 'Cria uma nova conta usando credenciais do Google OAuth'
  })
  @ApiBody({ type: GoogleAuthDto, description: 'Dados de cadastro do Google' })
  @ApiResponse({ status: 201, description: 'Cadastro com Google realizado com sucesso' })
  @ApiResponse({ status: 409, description: 'Usuário já existe' })
  @ApiResponse({ status: 401, description: 'Falha na autenticação com Google' })
  async googleSignUp(@Body() googleAuthDto: GoogleAuthDto) {
    return this.authService.googleSignUp(googleAuthDto);
  }

  @Post('google/signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login com Google',
    description: 'Faz login usando credenciais do Google OAuth (apenas para usuários já cadastrados via Google)'
  })
  @ApiBody({ type: GoogleAuthDto, description: 'Dados de login do Google' })
  @ApiResponse({ status: 200, description: 'Login com Google realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Usuário não encontrado ou conta criada com email/senha' })
  async googleSignIn(@Body() googleAuthDto: GoogleAuthDto) {
    return this.authService.googleSignIn(googleAuthDto);
  }
}
