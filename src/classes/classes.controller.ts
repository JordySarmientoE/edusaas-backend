import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { MessageResponseDto } from '../common/dto/message-response.dto';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { AssignTeacherDto } from './dto/assign-teacher.dto';
import { ClassFiltersDto } from './dto/class-filters.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { SetScheduleDto } from './dto/set-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { SchoolClass } from './entities/class.entity';
import { Schedule } from './entities/schedule.entity';
import { ClassesService } from './classes.service';

@Controller('classes')
@ApiTags('Classes')
@ApiBearerAuth('access-token')
export class ClassesController {
  constructor(
    private readonly classesService: ClassesService,
    private readonly usersService: UsersService
  ) {}

  @Post()
  @Roles(Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Crear una clase' })
  @ApiCreatedResponse({ type: SchoolClass })
  createClass(@Body() dto: CreateClassDto, @Req() request: { schoolId?: string }) {
    return this.classesService.createClass(dto, request.schoolId!);
  }

  @Get()
  @Roles(Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Listar clases del colegio' })
  @ApiPaginatedResponse(SchoolClass)
  findAll(@Query() filters: ClassFiltersDto, @Req() request: { schoolId?: string }) {
    return this.classesService.findAll(filters, request.schoolId!);
  }

  @Get('my')
  @Roles(Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Listar las clases del usuario autenticado' })
  @ApiOkResponse({ type: SchoolClass, isArray: true })
  findMyClasses(@CurrentUser() user: JwtPayload, @Req() request: { schoolId?: string }) {
    if (user.role === Role.STUDENT) {
      return this.classesService.findStudentClasses(user.sub, request.schoolId!);
    }

    if (user.role === Role.PARENT) {
      return this.classesService.findParentClasses(user.sub, request.schoolId!);
    }

    return this.classesService.findTeacherClasses(user.sub, request.schoolId!);
  }

  @Get('teacher/:teacherId/schedule')
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Obtener el horario de un profesor' })
  @ApiParam({ name: 'teacherId', description: 'Identificador unico del profesor' })
  @ApiOkResponse({ type: Schedule, isArray: true })
  getTeacherSchedule(@Param('teacherId') teacherId: string, @Req() request: { schoolId?: string }) {
    return this.classesService.getTeacherSchedule(teacherId, request.schoolId!);
  }

  @Get(':id/schedules')
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiOperation({ summary: 'Obtener todos los horarios de una clase' })
  @ApiParam({ name: 'id', description: 'Identificador unico de la clase' })
  @ApiOkResponse({ type: Schedule, isArray: true })
  async getClassSchedules(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Req() request: { schoolId?: string }
  ) {
    if (user.role === Role.STUDENT) {
      const canAccess = await this.classesService.studentHasClassAccess(id, user.sub, request.schoolId!);

      if (!canAccess) {
        throw new ForbiddenException('No tienes acceso al horario de esta clase');
      }
    }

    return this.classesService.getClassSchedules(id, request.schoolId!);
  }

  @Get(':id/students')
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Obtener los alumnos asignados a una clase' })
  @ApiParam({ name: 'id', description: 'Identificador unico de la clase' })
  @ApiOkResponse({ type: User, isArray: true })
  getClassStudents(@Param('id') id: string, @Req() request: { schoolId?: string }) {
    return this.usersService.getStudentsByClass(id, request.schoolId!);
  }

  @Patch('schedules/:scheduleId')
  @Roles(Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Actualizar un horario de clase' })
  @ApiParam({ name: 'scheduleId', description: 'Identificador unico del horario' })
  @ApiOkResponse({ type: Schedule })
  updateSchedule(
    @Param('scheduleId') scheduleId: string,
    @Body() dto: UpdateScheduleDto,
    @Req() request: { schoolId?: string }
  ) {
    return this.classesService.updateSchedule(scheduleId, dto, request.schoolId!);
  }

  @Delete('schedules/:scheduleId')
  @Roles(Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Eliminar un horario de clase' })
  @ApiParam({ name: 'scheduleId', description: 'Identificador unico del horario' })
  @ApiOkResponse({ type: MessageResponseDto })
  async deleteSchedule(@Param('scheduleId') scheduleId: string, @Req() request: { schoolId?: string }) {
    await this.classesService.deleteSchedule(scheduleId, request.schoolId!);
    return { message: 'Horario eliminado correctamente' };
  }

  @Get(':id')
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Obtener el detalle de una clase' })
  @ApiParam({ name: 'id', description: 'Identificador unico de la clase' })
  @ApiOkResponse({ type: SchoolClass })
  findById(@Param('id') id: string, @Req() request: { schoolId?: string }) {
    return this.classesService.findById(id, request.schoolId!);
  }

  @Patch(':id')
  @Roles(Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Actualizar una clase' })
  @ApiParam({ name: 'id', description: 'Identificador unico de la clase' })
  @ApiOkResponse({ type: SchoolClass })
  updateClass(
    @Param('id') id: string,
    @Body() dto: UpdateClassDto,
    @Req() request: { schoolId?: string }
  ) {
    return this.classesService.updateClass(id, dto, request.schoolId!);
  }

  @Patch(':id/teacher')
  @Roles(Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Asignar o cambiar el profesor de una clase' })
  @ApiParam({ name: 'id', description: 'Identificador unico de la clase' })
  @ApiOkResponse({ type: MessageResponseDto })
  async assignTeacher(
    @Param('id') id: string,
    @Body() dto: AssignTeacherDto,
    @Req() request: { schoolId?: string }
  ) {
    await this.classesService.assignTeacher(id, dto, request.schoolId!);
    return { message: 'Profesor asignado correctamente' };
  }

  @Post(':id/schedules')
  @Roles(Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Registrar horarios de una clase' })
  @ApiParam({ name: 'id', description: 'Identificador unico de la clase' })
  @ApiCreatedResponse({ type: Schedule })
  setSchedule(
    @Param('id') id: string,
    @Body() dto: SetScheduleDto,
    @Req() request: { schoolId?: string }
  ) {
    return this.classesService.setSchedule(id, dto, request.schoolId!);
  }
}
