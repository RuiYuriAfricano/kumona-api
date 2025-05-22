import { Controller, Get, Put, Delete, Param, Body, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
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
}
