import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { EnrollmentFiltersDto } from './dto/enrollment-filters.dto';
import { UpdateEnrollmentStatusDto } from './dto/update-enrollment-status.dto';
import { Enrollment } from './entities/enrollment.entity';
import { EnrollmentService } from './enrollment.service';

@Controller('enrollments')
@Roles(Role.SCHOOL_ADMIN)
@ApiTags('Enrollments')
@ApiBearerAuth('access-token')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar una nueva postulacion o matricula' })
  @ApiCreatedResponse({ type: Enrollment })
  createEnrollment(@Body() dto: CreateEnrollmentDto, @Req() request: { schoolId?: string }) {
    return this.enrollmentService.createEnrollment(dto, request.schoolId!);
  }

  @Get()
  @ApiOperation({ summary: 'Listar matriculas y postulaciones' })
  @ApiPaginatedResponse(Enrollment)
  findAll(@Query() filters: EnrollmentFiltersDto, @Req() request: { schoolId?: string }) {
    return this.enrollmentService.findAll(filters, request.schoolId!);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener el detalle de una matricula' })
  @ApiParam({ name: 'id', description: 'Identificador unico de la matricula' })
  @ApiOkResponse({ type: Enrollment })
  findById(@Param('id') id: string, @Req() request: { schoolId?: string }) {
    return this.enrollmentService.findById(id, request.schoolId!);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Actualizar el estado de una matricula' })
  @ApiParam({ name: 'id', description: 'Identificador unico de la matricula' })
  @ApiOkResponse({ type: Enrollment })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEnrollmentStatusDto,
    @Req() request: { schoolId?: string }
  ) {
    return this.enrollmentService.updateStatus(id, dto.status, request.schoolId!);
  }

  @Post(':id/expedient')
  @ApiOperation({ summary: 'Generar el expediente asociado a una matricula' })
  @ApiParam({ name: 'id', description: 'Identificador unico de la matricula' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      additionalProperties: true
    }
  })
  generateExpedient(@Param('id') id: string, @Req() request: { schoolId?: string }) {
    return this.enrollmentService.generateExpedient(id, request.schoolId!);
  }

  @Get('student/:studentId/history')
  @ApiOperation({ summary: 'Consultar el historial de matriculas de un alumno' })
  @ApiParam({ name: 'studentId', description: 'Identificador unico del alumno' })
  @ApiOkResponse({ type: Enrollment, isArray: true })
  getEnrollmentHistory(@Param('studentId') studentId: string, @Req() request: { schoolId?: string }) {
    return this.enrollmentService.getEnrollmentHistory(studentId, request.schoolId!);
  }
}
