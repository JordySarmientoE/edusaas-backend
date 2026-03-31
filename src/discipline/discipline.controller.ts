import { Body, Controller, Delete, Get, Param, Patch, Post, Req, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { MessageResponseDto } from '../common/dto/message-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { Incident } from './entities/incident.entity';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { DisciplineService } from './discipline.service';

@Controller('incidents')
@ApiTags('Discipline')
@ApiBearerAuth('access-token')
export class DisciplineController {
  constructor(private readonly disciplineService: DisciplineService) {}

  @Post()
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Registrar una incidencia disciplinaria' })
  @ApiCreatedResponse({ type: Incident })
  createIncident(
    @Body() dto: CreateIncidentDto,
    @Req() request: { schoolId?: string },
    @CurrentUser() user: JwtPayload
  ) {
    return this.disciplineService.createIncident(dto, request.schoolId!, user.sub);
  }

  @Get('student/:studentId')
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Listar incidencias de un alumno' })
  @ApiParam({ name: 'studentId', description: 'Identificador unico del alumno' })
  @ApiOkResponse({ type: Incident, isArray: true })
  async getByStudent(
    @Param('studentId') studentId: string,
    @CurrentUser() user: JwtPayload,
    @Req() request: { schoolId?: string }
  ) {
    if (user.role === Role.STUDENT && user.sub !== studentId) {
      throw new ForbiddenException('No puedes ver incidencias de otro alumno');
    }

    if (user.role === Role.PARENT) {
      const linkedStudents = await this.disciplineService.getLinkedStudentsForParent(user.sub, request.schoolId!);
      if (!linkedStudents.some((student) => student.id === studentId)) {
        throw new ForbiddenException('No tienes acceso a las incidencias de este alumno');
      }
    }

    return this.disciplineService.getByStudent(studentId, request.schoolId!);
  }

  @Patch(':id')
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Actualizar una incidencia disciplinaria' })
  @ApiParam({ name: 'id', description: 'Identificador unico de la incidencia' })
  @ApiOkResponse({ type: Incident })
  updateIncident(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentDto,
    @Req() request: { schoolId?: string }
  ) {
    return this.disciplineService.updateIncident(id, dto, request.schoolId!);
  }

  @Delete(':id')
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Eliminar una incidencia disciplinaria' })
  @ApiParam({ name: 'id', description: 'Identificador unico de la incidencia' })
  @ApiOkResponse({ type: MessageResponseDto })
  async deleteIncident(@Param('id') id: string, @Req() request: { schoolId?: string }) {
    await this.disciplineService.deleteIncident(id, request.schoolId!);
    return { message: 'Incidente eliminado correctamente' };
  }
}
