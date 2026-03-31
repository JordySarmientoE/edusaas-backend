import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { MessageResponseDto } from '../common/dto/message-response.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AcademicCycle } from './entities/academic-cycle.entity';
import { Course } from './entities/course.entity';
import { GradeCourseConfig } from './entities/grade-course-config.entity';
import { Grade } from './entities/grade.entity';
import { Section } from './entities/section.entity';
import { AcademicCyclesService } from './academic-cycles.service';
import { ConfigureGradeCourseDto } from './dto/configure-grade-course.dto';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateGradeDto } from './dto/create-grade.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateCycleDto } from './dto/update-cycle.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { UpdateGradeCourseConfigDto } from './dto/update-grade-course-config.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { UpdateSectionDto } from './dto/update-section.dto';

@Controller('academic-cycles')
@Roles(Role.SCHOOL_ADMIN)
@ApiTags('Academic Cycles')
@ApiBearerAuth('access-token')
export class AcademicCyclesController {
  constructor(private readonly academicCyclesService: AcademicCyclesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un ciclo academico' })
  @ApiCreatedResponse({ type: AcademicCycle })
  createCycle(@Body() dto: CreateCycleDto, @Req() request: { schoolId?: string }) {
    return this.academicCyclesService.createCycle(dto, request.schoolId!);
  }

  @Get()
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'Listar ciclos academicos del colegio' })
  @ApiOkResponse({ type: AcademicCycle, isArray: true })
  findAll(@Req() request: { schoolId?: string }) {
    return this.academicCyclesService.findAll(request.schoolId!);
  }

  @Post('grades')
  @ApiOperation({ summary: 'Crear un grado del colegio' })
  @ApiCreatedResponse({ type: Grade })
  createGrade(@Body() dto: CreateGradeDto, @Req() request: { schoolId?: string }) {
    return this.academicCyclesService.createGrade(dto, request.schoolId!);
  }

  @Get('grades')
  @ApiOperation({ summary: 'Listar grados del colegio' })
  @ApiOkResponse({ type: Grade, isArray: true })
  findGrades(@Req() request: { schoolId?: string }) {
    return this.academicCyclesService.findAllGrades(request.schoolId!);
  }

  @Patch('grades/:id')
  @ApiOperation({ summary: 'Actualizar un grado' })
  @ApiParam({ name: 'id', description: 'Identificador unico del grado' })
  @ApiOkResponse({ type: Grade })
  updateGrade(
    @Param('id') id: string,
    @Body() dto: UpdateGradeDto,
    @Req() request: { schoolId?: string }
  ) {
    return this.academicCyclesService.updateGrade(id, dto, request.schoolId!);
  }

  @Post('courses')
  @ApiOperation({ summary: 'Crear un curso del colegio' })
  @ApiCreatedResponse({ type: Course })
  createCourse(@Body() dto: CreateCourseDto, @Req() request: { schoolId?: string }) {
    return this.academicCyclesService.createCourse(dto, request.schoolId!);
  }

  @Get('courses')
  @ApiOperation({ summary: 'Listar cursos del colegio' })
  @ApiOkResponse({ type: Course, isArray: true })
  findCourses(@Req() request: { schoolId?: string }) {
    return this.academicCyclesService.findAllCourses(request.schoolId!);
  }

  @Patch('courses/:id')
  @ApiOperation({ summary: 'Actualizar un curso del colegio' })
  @ApiParam({ name: 'id', description: 'Identificador unico del curso' })
  @ApiOkResponse({ type: Course })
  updateCourse(@Param('id') id: string, @Body() dto: UpdateCourseDto, @Req() request: { schoolId?: string }) {
    return this.academicCyclesService.updateCourse(id, dto, request.schoolId!);
  }

  @Post('grades/:gradeId/courses')
  @ApiOperation({ summary: 'Configurar un curso por defecto para un grado' })
  @ApiParam({ name: 'gradeId', description: 'Identificador unico del grado' })
  @ApiCreatedResponse({ type: GradeCourseConfig })
  configureGradeCourse(
    @Param('gradeId') gradeId: string,
    @Body() dto: ConfigureGradeCourseDto,
    @Req() request: { schoolId?: string }
  ) {
    return this.academicCyclesService.configureGradeCourse(gradeId, dto, request.schoolId!);
  }

  @Get('grades/:gradeId/courses')
  @ApiOperation({ summary: 'Listar configuración de cursos por grado' })
  @ApiParam({ name: 'gradeId', description: 'Identificador unico del grado' })
  @ApiOkResponse({ type: GradeCourseConfig, isArray: true })
  findGradeCourses(@Param('gradeId') gradeId: string, @Req() request: { schoolId?: string }) {
    return this.academicCyclesService.findGradeCourseConfigs(gradeId, request.schoolId!);
  }

  @Patch('grade-course-configs/:id')
  @ApiOperation({ summary: 'Actualizar configuración de curso por grado' })
  @ApiParam({ name: 'id', description: 'Identificador unico de la configuración' })
  @ApiOkResponse({ type: GradeCourseConfig })
  updateGradeCourseConfig(
    @Param('id') id: string,
    @Body() dto: UpdateGradeCourseConfigDto,
    @Req() request: { schoolId?: string }
  ) {
    return this.academicCyclesService.updateGradeCourseConfig(id, dto, request.schoolId!);
  }

  @Post(':cycleId/sections')
  @ApiOperation({ summary: 'Crear una seccion dentro de un ciclo y un grado' })
  @ApiParam({ name: 'cycleId', description: 'Identificador unico del ciclo' })
  @ApiCreatedResponse({ type: Section })
  createSection(
    @Param('cycleId') cycleId: string,
    @Body() dto: CreateSectionDto,
    @Req() request: { schoolId?: string }
  ) {
    return this.academicCyclesService.createSection(cycleId, dto, request.schoolId!);
  }

  @Get(':cycleId/sections')
  @ApiOperation({ summary: 'Listar secciones de un ciclo académico' })
  @ApiParam({ name: 'cycleId', description: 'Identificador unico del ciclo' })
  @ApiOkResponse({ type: Section, isArray: true })
  findSections(
    @Param('cycleId') cycleId: string,
    @Query('gradeId') gradeId: string | undefined,
    @Req() request: { schoolId?: string }
  ) {
    return this.academicCyclesService.findSectionsByCycle(cycleId, request.schoolId!, gradeId);
  }

  @Patch('sections/:id')
  @ApiOperation({ summary: 'Actualizar una seccion' })
  @ApiParam({ name: 'id', description: 'Identificador unico de la seccion' })
  @ApiOkResponse({ type: Section })
  updateSection(
    @Param('id') id: string,
    @Body() dto: UpdateSectionDto,
    @Req() request: { schoolId?: string }
  ) {
    return this.academicCyclesService.updateSection(id, dto, request.schoolId!);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un ciclo academico por id' })
  @ApiParam({ name: 'id', description: 'Identificador unico del ciclo academico' })
  @ApiOkResponse({ type: AcademicCycle })
  findById(@Param('id') id: string, @Req() request: { schoolId?: string }) {
    return this.academicCyclesService.findById(id, request.schoolId!);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un ciclo academico' })
  @ApiParam({ name: 'id', description: 'Identificador unico del ciclo academico' })
  @ApiOkResponse({ type: AcademicCycle })
  updateCycle(
    @Param('id') id: string,
    @Body() dto: UpdateCycleDto,
    @Req() request: { schoolId?: string }
  ) {
    return this.academicCyclesService.updateCycle(id, dto, request.schoolId!);
  }

  @Patch(':id/close')
  @ApiOperation({ summary: 'Cerrar un ciclo academico' })
  @ApiParam({ name: 'id', description: 'Identificador unico del ciclo academico' })
  @ApiOkResponse({ type: MessageResponseDto })
  async closeCycle(@Param('id') id: string, @Req() request: { schoolId?: string }) {
    await this.academicCyclesService.closeCycle(id, request.schoolId!);
    return { message: 'Ciclo cerrado correctamente' };
  }

  @Patch(':id/reopen')
  @ApiOperation({ summary: 'Reabrir un ciclo academico' })
  @ApiParam({ name: 'id', description: 'Identificador unico del ciclo academico' })
  @ApiOkResponse({ type: MessageResponseDto })
  async reopenCycle(@Param('id') id: string, @Req() request: { schoolId?: string }) {
    await this.academicCyclesService.reopenCycle(id, request.schoolId!);
    return { message: 'Ciclo reabierto correctamente' };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un ciclo academico' })
  @ApiParam({ name: 'id', description: 'Identificador unico del ciclo academico' })
  @ApiOkResponse({ type: MessageResponseDto })
  async deleteCycle(@Param('id') id: string, @Req() request: { schoolId?: string }) {
    await this.academicCyclesService.deleteCycle(id, request.schoolId!);
    return { message: 'Ciclo eliminado correctamente' };
  }
}
