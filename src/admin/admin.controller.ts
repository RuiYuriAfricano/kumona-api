import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  HttpStatus
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService } from './admin.service';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicStatusDto, ClinicStatus } from './dto/update-clinic-status.dto';
import { AdminStatsDto } from './dto/admin-stats.dto';
import { UserRole } from '@prisma/client';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('clinics')
  @ApiOperation({ summary: 'Criar nova clínica (apenas admin)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Clínica criada com sucesso'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Acesso negado - apenas administradores'
  })
  async createClinic(
    @Request() req,
    @Body() createClinicDto: CreateClinicDto
  ) {
    return this.adminService.createClinic(req.user.id, createClinicDto);
  }

  @Get('clinics')
  @ApiOperation({ summary: 'Listar todas as clínicas (apenas admin)' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ClinicStatus,
    description: 'Filtrar por status da clínica'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de clínicas retornada com sucesso'
  })
  async getAllClinics(
    @Request() req,
    @Query('status') status?: ClinicStatus
  ) {
    return this.adminService.getAllClinics(req.user.id, status);
  }

  @Get('clinics/:id')
  @ApiOperation({ summary: 'Obter detalhes de uma clínica específica (apenas admin)' })
  @ApiParam({
    name: 'id',
    description: 'ID da clínica',
    type: 'number'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Detalhes da clínica retornados com sucesso'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Clínica não encontrada'
  })
  async getClinicById(
    @Request() req,
    @Param('id', ParseIntPipe) clinicId: number
  ) {
    return this.adminService.getClinicById(req.user.id, clinicId);
  }

  @Put('clinics/:id/status')
  @ApiOperation({ summary: 'Atualizar status de uma clínica (apenas admin)' })
  @ApiParam({
    name: 'id',
    description: 'ID da clínica',
    type: 'number'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Status da clínica atualizado com sucesso'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Clínica não encontrada'
  })
  async updateClinicStatus(
    @Request() req,
    @Param('id', ParseIntPipe) clinicId: number,
    @Body() updateStatusDto: UpdateClinicStatusDto
  ) {
    return this.adminService.updateClinicStatus(req.user.id, clinicId, updateStatusDto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obter estatísticas administrativas (apenas admin)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estatísticas retornadas com sucesso',
    type: AdminStatsDto
  })
  async getAdminStats(@Request() req): Promise<AdminStatsDto> {
    return this.adminService.getAdminStats(req.user.id);
  }

  @Get('users')
  @ApiOperation({ summary: 'Listar todos os usuários (apenas admin)' })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: UserRole,
    description: 'Filtrar por role do usuário'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de usuários retornada com sucesso'
  })
  async getAllUsers(
    @Request() req,
    @Query('role') role?: UserRole
  ) {
    return this.adminService.getAllUsers(req.user.id, role);
  }

  @Put('users/:id/promote-admin')
  @ApiOperation({ summary: 'Promover usuário para administrador (apenas admin)' })
  @ApiParam({
    name: 'id',
    description: 'ID do usuário',
    type: 'number'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Usuário promovido para administrador com sucesso'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Usuário não encontrado'
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Usuário já é administrador'
  })
  async promoteToAdmin(
    @Request() req,
    @Param('id', ParseIntPipe) userId: number
  ) {
    return this.adminService.promoteToAdmin(req.user.id, userId);
  }
}
