import { Controller, Get, Put, Delete, Param, Body, UseGuards, Request, ParseIntPipe, Patch, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateUserDto } from './dtos/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Obter perfil do usuário', description: 'Retorna os dados completos do perfil do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil do usuário retornado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async getProfile(@Request() req) {
    return this.userService.getUserProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  @ApiOperation({ summary: 'Atualizar perfil do usuário', description: 'Atualiza os dados do perfil do usuário autenticado' })
  @ApiBody({ type: UpdateUserDto, description: 'Dados a serem atualizados' })
  @ApiResponse({ status: 200, description: 'Perfil atualizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async updateProfile(@Request() req, @Body() body: UpdateUserDto) {
    return this.userService.updateUser(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('settings')
  @ApiOperation({ summary: 'Obter configurações do usuário', description: 'Retorna as configurações/preferências do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Configurações retornadas com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async getUserSettings(@Request() req) {
    const profile = await this.userService.getUserProfile(req.user.id);
    return {
      notificationsEnabled: profile.preferences?.notificationsEnabled ?? true,
      emailNotifications: false, // Adicionar ao modelo se necessário
      language: profile.preferences?.language ?? 'pt',
      theme: profile.preferences?.theme ?? 'light',
      fontSize: 'Médio', // Adicionar ao modelo se necessário
      dataUsage: 'Automático', // Adicionar ao modelo se necessário
      reminderFrequency: profile.preferences?.reminderFrequency ?? 'daily'
    };
  }

  @UseGuards(JwtAuthGuard)
  @Put('settings')
  @ApiOperation({ summary: 'Atualizar configurações do usuário', description: 'Atualiza as configurações/preferências do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Configurações atualizadas com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async updateUserSettings(@Request() req, @Body() settingsData: any) {
    // Mapear configurações para o formato de preferências
    const preferences: any = {};

    if (settingsData.notificationsEnabled !== undefined) {
      preferences.notificationsEnabled = settingsData.notificationsEnabled;
    }
    if (settingsData.language !== undefined) {
      preferences.language = settingsData.language;
    }
    if (settingsData.theme !== undefined) {
      preferences.theme = settingsData.theme;
    }
    if (settingsData.reminderFrequency !== undefined) {
      preferences.reminderFrequency = settingsData.reminderFrequency;
    }

    // Atualizar apenas as preferências
    await this.userService.updateUser(req.user.id, { preferences });

    return {
      success: true,
      settings: settingsData,
      updatedAt: new Date().toISOString()
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Listar todos os usuários', description: 'Retorna uma lista de todos os usuários ativos' })
  @ApiResponse({ status: 200, description: 'Lista de usuários retornada com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getAllUsers() {
    return this.userService.getAllUsers();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Obter usuário por ID', description: 'Retorna os dados de um usuário específico' })
  @ApiParam({ name: 'id', description: 'ID do usuário', type: Number })
  @ApiResponse({ status: 200, description: 'Usuário retornado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getUserById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Excluir usuário', description: 'Realiza a exclusão lógica de um usuário' })
  @ApiParam({ name: 'id', description: 'ID do usuário', type: Number })
  @ApiResponse({ status: 200, description: 'Usuário excluído com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async softDeleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.userService.softDeleteUser(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('complete-first-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Marcar primeiro login como completo',
    description: 'Marca que o usuário já completou o primeiro login e não deve mais ver a tela de boas-vindas'
  })
  @ApiResponse({ status: 200, description: 'Primeiro login marcado como completo' })
  @ApiResponse({ status: 401, description: 'Token inválido' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async completeFirstLogin(@Request() req) {
    await this.userService.markFirstLoginComplete(req.user.id);
    return { message: 'Primeiro login marcado como completo' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('select-clinic')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Selecionar clínica para acompanhamento',
    description: 'Permite ao usuário selecionar uma clínica para acompanhar sua jornada de saúde ocular'
  })
  @ApiResponse({ status: 200, description: 'Clínica selecionada com sucesso' })
  @ApiResponse({ status: 401, description: 'Token inválido' })
  @ApiResponse({ status: 404, description: 'Clínica não encontrada' })
  async selectClinic(@Request() req, @Body() body: { clinicId: number }) {
    await this.userService.selectClinic(req.user.id, body.clinicId);
    return { message: 'Clínica selecionada com sucesso' };
  }
}
