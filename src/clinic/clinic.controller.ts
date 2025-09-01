import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  HttpStatus,
  DefaultValuePipe,
  UseInterceptors,
  UploadedFile
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiConsumes
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClinicService } from './clinic.service';
import { PatientDiagnosisService } from './patient-diagnosis.service';
import { SpecialistFeedbackService } from './specialist-feedback.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdateClinicProfileDto } from './dto/update-clinic-profile.dto';
import { ClinicStatsDto } from './dto/clinic-stats.dto';
import { CreatePatientDiagnosisDto } from './dto/create-patient-diagnosis.dto';
import { CreateSpecialistFeedbackDto, ValidateDiagnosisDto } from './dto/specialist-feedback.dto';

@ApiTags('Clinic')
@Controller('clinic')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ClinicController {
  constructor(
    private readonly clinicService: ClinicService,
    private readonly patientDiagnosisService: PatientDiagnosisService,
    private readonly specialistFeedbackService: SpecialistFeedbackService
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Obter perfil da clínica' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Perfil da clínica retornado com sucesso'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Acesso negado - apenas clínicas aprovadas'
  })
  async getProfile(@Request() req) {
    return this.clinicService.getClinicProfile(req.user.id);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Atualizar perfil da clínica' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Perfil atualizado com sucesso'
  })
  async updateProfile(
    @Request() req,
    @Body() updateProfileDto: UpdateClinicProfileDto
  ) {
    return this.clinicService.updateClinicProfile(req.user.id, updateProfileDto);
  }

  @Post('patients')
  @ApiOperation({ summary: 'Cadastrar novo paciente' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Paciente cadastrado com sucesso'
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'CPF já cadastrado'
  })
  async createPatient(
    @Request() req,
    @Body() createPatientDto: CreatePatientDto
  ) {
    return this.clinicService.createPatient(req.user.id, createPatientDto);
  }

  @Get('patients')
  @ApiOperation({ summary: 'Listar pacientes da clínica' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número da página (padrão: 1)'
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Itens por página (padrão: 10)'
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Buscar por nome, email ou CPF'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de pacientes retornada com sucesso'
  })
  async getPatients(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string
  ) {
    return this.clinicService.getPatients(req.user.id, page, limit, search);
  }

  @Get('patients/:id')
  @ApiOperation({ summary: 'Obter detalhes de um paciente específico' })
  @ApiParam({
    name: 'id',
    description: 'ID do paciente',
    type: 'number'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Detalhes do paciente retornados com sucesso'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Paciente não encontrado'
  })
  async getPatientById(
    @Request() req,
    @Param('id', ParseIntPipe) patientId: number
  ) {
    return this.clinicService.getPatientById(req.user.id, patientId);
  }

  @Put('patients/:id')
  @ApiOperation({ summary: 'Atualizar dados de um paciente' })
  @ApiParam({
    name: 'id',
    description: 'ID do paciente',
    type: 'number'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paciente atualizado com sucesso'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Paciente não encontrado'
  })
  async updatePatient(
    @Request() req,
    @Param('id', ParseIntPipe) patientId: number,
    @Body() updateData: Partial<CreatePatientDto>
  ) {
    return this.clinicService.updatePatient(req.user.id, patientId, updateData);
  }

  @Delete('patients/:id')
  @ApiOperation({ summary: 'Remover paciente' })
  @ApiParam({
    name: 'id',
    description: 'ID do paciente',
    type: 'number'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paciente removido com sucesso'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Paciente não encontrado'
  })
  async deletePatient(
    @Request() req,
    @Param('id', ParseIntPipe) patientId: number
  ) {
    return this.clinicService.deletePatient(req.user.id, patientId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obter estatísticas da clínica' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estatísticas retornadas com sucesso',
    type: ClinicStatsDto
  })
  async getStats(@Request() req): Promise<ClinicStatsDto> {
    return this.clinicService.getClinicStats(req.user.id);
  }

  // === ENDPOINTS DE DIAGNÓSTICOS ===

  @Post('patients/:patientId/diagnoses/analyze')
  @ApiOperation({ summary: 'Analisar imagem de paciente com IA' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'patientId',
    description: 'ID do paciente',
    type: 'number'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Análise realizada com sucesso'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Paciente não encontrado'
  })
  @UseInterceptors(FileInterceptor('image'))
  async analyzePatientImage(
    @Request() req,
    @Param('patientId', ParseIntPipe) patientId: number,
    @UploadedFile() imageFile: Express.Multer.File
  ) {
    return this.patientDiagnosisService.analyzePatientImage(req.user.id, patientId, imageFile);
  }

  @Post('patients/:patientId/diagnoses/manual')
  @ApiOperation({ summary: 'Criar diagnóstico manual para paciente' })
  @ApiParam({
    name: 'patientId',
    description: 'ID do paciente',
    type: 'number'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Diagnóstico manual criado com sucesso'
  })
  async createManualDiagnosis(
    @Request() req,
    @Param('patientId', ParseIntPipe) patientId: number,
    @Body() createDiagnosisDto: CreatePatientDiagnosisDto
  ) {
    // Garantir que o patientId do DTO seja o mesmo do parâmetro
    createDiagnosisDto.patientId = patientId;
    return this.patientDiagnosisService.createManualDiagnosis(req.user.id, createDiagnosisDto);
  }

  @Get('patients/:patientId/diagnoses')
  @ApiOperation({ summary: 'Listar diagnósticos de um paciente' })
  @ApiParam({
    name: 'patientId',
    description: 'ID do paciente',
    type: 'number'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de diagnósticos retornada com sucesso'
  })
  async getPatientDiagnoses(
    @Request() req,
    @Param('patientId', ParseIntPipe) patientId: number
  ) {
    return this.patientDiagnosisService.getPatientDiagnoses(req.user.id, patientId);
  }

  @Get('diagnoses/:diagnosisId')
  @ApiOperation({ summary: 'Obter detalhes de um diagnóstico específico' })
  @ApiParam({
    name: 'diagnosisId',
    description: 'ID do diagnóstico',
    type: 'number'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Detalhes do diagnóstico retornados com sucesso'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Diagnóstico não encontrado'
  })
  async getDiagnosisById(
    @Request() req,
    @Param('diagnosisId', ParseIntPipe) diagnosisId: number
  ) {
    return this.patientDiagnosisService.getDiagnosisById(req.user.id, diagnosisId);
  }

  // === ENDPOINTS DE FEEDBACK DE ESPECIALISTAS ===

  @Put('diagnoses/:diagnosisId/validate')
  @ApiOperation({ summary: 'Validar diagnóstico por especialista' })
  @ApiParam({
    name: 'diagnosisId',
    description: 'ID do diagnóstico',
    type: 'number'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Diagnóstico validado com sucesso'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Diagnóstico não encontrado'
  })
  async validateDiagnosis(
    @Request() req,
    @Param('diagnosisId', ParseIntPipe) diagnosisId: number,
    @Body() validateDto: ValidateDiagnosisDto
  ) {
    return this.specialistFeedbackService.validateDiagnosis(req.user.id, diagnosisId, validateDto);
  }

  @Post('diagnoses/:diagnosisId/feedback')
  @ApiOperation({ summary: 'Criar feedback detalhado de especialista' })
  @ApiParam({
    name: 'diagnosisId',
    description: 'ID do diagnóstico',
    type: 'number'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Feedback criado com sucesso'
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Feedback já existe para este diagnóstico'
  })
  async createSpecialistFeedback(
    @Request() req,
    @Param('diagnosisId', ParseIntPipe) diagnosisId: number,
    @Body() feedbackDto: CreateSpecialistFeedbackDto
  ) {
    return this.specialistFeedbackService.createSpecialistFeedback(req.user.id, diagnosisId, feedbackDto);
  }

  @Get('validations/pending')
  @ApiOperation({ summary: 'Listar diagnósticos pendentes de validação' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número da página (padrão: 1)'
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Itens por página (padrão: 10)'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de diagnósticos pendentes retornada com sucesso'
  })
  async getPendingValidations(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number
  ) {
    return this.specialistFeedbackService.getPendingValidations(req.user.id, page, limit);
  }

  @Get('feedbacks')
  @ApiOperation({ summary: 'Listar todos os feedbacks da clínica' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número da página (padrão: 1)'
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Itens por página (padrão: 10)'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de feedbacks retornada com sucesso'
  })
  async getClinicFeedbacks(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number
  ) {
    return this.specialistFeedbackService.getClinicFeedbacks(req.user.id, page, limit);
  }

  @Get('feedbacks/stats')
  @ApiOperation({ summary: 'Obter estatísticas de feedback da clínica' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estatísticas de feedback retornadas com sucesso'
  })
  async getFeedbackStats(@Request() req) {
    return this.specialistFeedbackService.getFeedbackStats(req.user.id);
  }
}
