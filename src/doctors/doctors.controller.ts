import {
  Controller,
  Get,
  Query,
  Param,
  ParseIntPipe,
  HttpStatus,
  DefaultValuePipe
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam
} from '@nestjs/swagger';
import { DoctorsService } from './doctors.service';

@ApiTags('Doctors')
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar médicos/clínicas registrados' })
  @ApiQuery({
    name: 'specialty',
    required: false,
    type: String,
    description: 'Filtrar por especialidade'
  })
  @ApiQuery({
    name: 'city',
    required: false,
    type: String,
    description: 'Filtrar por cidade'
  })
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
    description: 'Itens por página (padrão: 20)'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de médicos retornada com sucesso'
  })
  async getDoctors(
    @Query('specialty') specialty?: string,
    @Query('city') city?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20
  ) {
    return this.doctorsService.getDoctors({ specialty, city, page, limit });
  }

  @Get('specialties')
  @ApiOperation({ summary: 'Listar especialidades disponíveis' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de especialidades retornada com sucesso'
  })
  async getSpecialties() {
    return this.doctorsService.getSpecialties();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de um médico específico' })
  @ApiParam({
    name: 'id',
    description: 'ID do médico/clínica',
    type: 'number'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Detalhes do médico retornados com sucesso'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Médico não encontrado'
  })
  async getDoctorById(@Param('id', ParseIntPipe) id: number) {
    return this.doctorsService.getDoctorById(id);
  }
}
