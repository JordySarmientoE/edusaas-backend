import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { MessageResponseDto } from '../common/dto/message-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ClassOwnershipGuard } from '../common/guards/class-ownership.guard';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { GradeClassSummaryDto, ParentGradeSummaryDto } from './dto/grade-summary.dto';
import { RegisterGradeDto } from './dto/register-grade.dto';
import { UpdateClassGradeConfigDto } from './dto/update-class-grade-config.dto';
import { GradeRecord } from './entities/grade-record.entity';
import { GradesService } from './grades.service';

@Controller()
@ApiTags('Grades')
@ApiBearerAuth('access-token')
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Post('grades')
  @Roles(Role.TEACHER)
  @UseGuards(ClassOwnershipGuard)
  @ApiOperation({ summary: 'Registrar una nota para un alumno' })
  @ApiOkResponse({ type: GradeRecord })
  registerGrade(@Body() dto: RegisterGradeDto, @Req() request: { schoolId?: string }) {
    return this.gradesService.registerGrade(dto, request.schoolId!);
  }

  @Get('grades/class/:classId')
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Consultar el consolidado de notas por clase' })
  @ApiParam({ name: 'classId', description: 'Identificador unico de la clase' })
  @ApiOkResponse({ type: GradeClassSummaryDto })
  getByClass(@Param('classId') classId: string, @Req() request: { schoolId?: string }) {
    return this.gradesService.getClassSummary(classId, request.schoolId!);
  }

  @Get('my/grades/:cycleId')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Consultar el consolidado de notas del alumno autenticado por ciclo' })
  @ApiParam({ name: 'cycleId', description: 'Identificador unico del ciclo academico' })
  @ApiOkResponse({ type: GradeClassSummaryDto, isArray: true })
  getMyGrades(
    @Param('cycleId') cycleId: string,
    @CurrentUser() user: JwtPayload,
    @Req() request: { schoolId?: string }
  ) {
    return this.gradesService.getStudentSummaries(user.sub, cycleId, request.schoolId!);
  }

  @Get('my/children/grades')
  @Roles(Role.PARENT, Role.TEACHER, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Consultar el consolidado de notas de los hijos vinculados al usuario' })
  @ApiOkResponse({ type: ParentGradeSummaryDto, isArray: true })
  getChildrenGrades(@CurrentUser() user: JwtPayload, @Req() request: { schoolId?: string }) {
    return this.gradesService.getParentSummaries(user.sub, request.schoolId!);
  }

  @Get('grades/class/:classId/config')
  @Roles(Role.TEACHER, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Consultar la configuración de evaluación de una clase' })
  @ApiParam({ name: 'classId', description: 'Identificador unico de la clase' })
  getClassConfig(@Param('classId') classId: string, @Req() request: { schoolId?: string }) {
    return this.gradesService.getOrCreateClassConfig(classId, request.schoolId!);
  }

  @Patch('grades/class/:classId/config')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Actualizar la configuración de evaluación de una clase' })
  @ApiParam({ name: 'classId', description: 'Identificador unico de la clase' })
  updateClassConfig(@Param('classId') classId: string, @Body() dto: UpdateClassGradeConfigDto, @Req() request: { schoolId?: string }) {
    return this.gradesService.updateClassConfig(classId, dto, request.schoolId!);
  }

  @Patch('grades/class/:classId/close')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Cerrar el curso y congelar su configuración de notas' })
  @ApiParam({ name: 'classId', description: 'Identificador unico de la clase' })
  @ApiOkResponse({ type: MessageResponseDto })
  async closeClass(@Param('classId') classId: string, @Req() request: { schoolId?: string }) {
    await this.gradesService.closeClassGrades(classId, request.schoolId!);
    return { message: 'Curso cerrado correctamente' };
  }

  @Patch('grades/class/:classId/reopen')
  @Roles(Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Reabrir el curso y permitir cambios nuevamente' })
  @ApiParam({ name: 'classId', description: 'Identificador unico de la clase' })
  @ApiOkResponse({ type: MessageResponseDto })
  async reopenClass(@Param('classId') classId: string, @Req() request: { schoolId?: string }) {
    await this.gradesService.reopenClassGrades(classId, request.schoolId!);
    return { message: 'Curso reabierto correctamente' };
  }

  @Patch('grades/cycle/:cycleId/close')
  @Roles(Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Cerrar el registro de notas de un ciclo academico' })
  @ApiParam({ name: 'cycleId', description: 'Identificador unico del ciclo academico' })
  @ApiOkResponse({ type: MessageResponseDto })
  async closeGrades(@Param('cycleId') cycleId: string, @Req() request: { schoolId?: string }) {
    await this.gradesService.closeGradesByPeriod(cycleId, request.schoolId!);
    return { message: 'Notas cerradas correctamente' };
  }
}
