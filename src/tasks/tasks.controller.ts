import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { MessageResponseDto } from '../common/dto/message-response.dto';
import { PaginatedResultDto } from '../common/dto/paginated-result.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ClassOwnershipGuard } from '../common/guards/class-ownership.guard';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { CreateTaskDto } from './dto/create-task.dto';
import { GradeTaskDto } from './dto/grade-task.dto';
import { ParentTaskDto } from './dto/parent-task.dto';
import { StudentTaskDto } from './dto/student-task.dto';
import { SubmitTaskDto } from './dto/submit-task.dto';
import { TaskFiltersDto } from './dto/task-filters.dto';
import { TaskGradebookResponseDto } from './dto/task-gradebook-response.dto';
import { TaskSubmissionDto } from './dto/task-submission.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskGrade } from './entities/task-grade.entity';
import { Task } from './entities/task.entity';
import { TasksService } from './tasks.service';

@Controller()
@ApiTags('Tasks')
@ApiBearerAuth('access-token')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('tasks')
  @Roles(Role.TEACHER)
  @UseGuards(ClassOwnershipGuard)
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({ summary: 'Crear una tarea para una clase' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        classId: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        description: { type: 'string' },
        taskType: { type: 'string', enum: ['homework', 'practice', 'exam', 'project', 'participation', 'other'] },
        submissionMode: { type: 'string', enum: ['student_submission', 'teacher_only'] },
        affectsGrade: { type: 'boolean' },
        maxScore: { type: 'number', nullable: true },
        dueDate: { type: 'string', format: 'date' },
        files: { type: 'array', items: { type: 'string', format: 'binary' } }
      },
      required: ['classId', 'title', 'description', 'taskType', 'submissionMode', 'affectsGrade', 'dueDate']
    }
  })
  @ApiCreatedResponse({ type: Task })
  createTask(
    @Body() dto: CreateTaskDto,
    @Req() request: { schoolId?: string },
    @CurrentUser() user: JwtPayload,
    @UploadedFiles() files?: Array<{ originalname: string; buffer: Buffer; mimetype?: string }>
  ) {
    return this.tasksService.createTask(this.normalizeCreateTaskDto(dto), request.schoolId!, user.sub, files ?? []);
  }

  @Get('tasks/class/:classId')
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Listar tareas por clase' })
  @ApiParam({ name: 'classId', description: 'Identificador unico de la clase' })
  @ApiOkResponse({ type: PaginatedResultDto<Task> })
  findByClass(
    @Param('classId') classId: string,
    @Query() filters: TaskFiltersDto,
    @Req() request: { schoolId?: string }
  ) {
    return this.tasksService.findByClass(classId, request.schoolId!, filters);
  }

  @Get('tasks/:id/gradebook')
  @Roles(Role.SCHOOL_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Obtener el gradebook de una tarea con todos los alumnos de la clase' })
  @ApiParam({ name: 'id', description: 'Identificador unico de la tarea' })
  @ApiOkResponse({ type: TaskGradebookResponseDto })
  getGradebook(@Param('id') id: string, @Req() request: { schoolId?: string }) {
    return this.tasksService.getTaskGradebook(id, request.schoolId!);
  }

  @Post('tasks/:id/gradebook')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Registrar o actualizar calificaciones masivas para una tarea' })
  @ApiParam({ name: 'id', description: 'Identificador unico de la tarea' })
  @ApiCreatedResponse({ type: TaskGrade, isArray: true })
  saveGradebook(@Param('id') id: string, @Body() dto: GradeTaskDto, @Req() request: { schoolId?: string }) {
    return this.tasksService.gradeTask(id, dto, request.schoolId!);
  }

  @Get('my/tasks')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Consultar las tareas del alumno autenticado' })
  @ApiOkResponse({ type: StudentTaskDto, isArray: true })
  getMyTasks(@CurrentUser() user: JwtPayload, @Req() request: { schoolId?: string }) {
    return this.tasksService.findByStudent(user.sub, request.schoolId!);
  }

  @Get('tasks/:id/submission/me')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Consultar la entrega del alumno autenticado para una actividad' })
  @ApiParam({ name: 'id', description: 'Identificador unico de la actividad' })
  @ApiOkResponse({ type: TaskSubmissionDto })
  getMySubmission(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Req() request: { schoolId?: string }) {
    return this.tasksService.getMySubmission(id, user.sub, request.schoolId!);
  }

  @Post('tasks/:id/submission/me')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Registrar o actualizar la entrega del alumno autenticado' })
  @ApiParam({ name: 'id', description: 'Identificador unico de la actividad' })
  @ApiCreatedResponse({ type: TaskSubmissionDto })
  submitTask(
    @Param('id') id: string,
    @Body() dto: SubmitTaskDto,
    @CurrentUser() user: JwtPayload,
    @Req() request: { schoolId?: string }
  ) {
    return this.tasksService.submitTask(id, dto, user.sub, request.schoolId!);
  }

  @Get('my/children/tasks')
  @Roles(Role.PARENT, Role.TEACHER, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Consultar las tareas de los hijos o estudiantes vinculados al usuario' })
  @ApiOkResponse({ type: ParentTaskDto, isArray: true })
  getChildrenTasks(@CurrentUser() user: JwtPayload, @Req() request: { schoolId?: string }) {
    return this.tasksService.findByParent(user.sub, request.schoolId!);
  }

  @Patch('tasks/:id')
  @Roles(Role.TEACHER)
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({ summary: 'Actualizar una tarea' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        taskType: { type: 'string', enum: ['homework', 'practice', 'exam', 'project', 'participation', 'other'] },
        submissionMode: { type: 'string', enum: ['student_submission', 'teacher_only'] },
        affectsGrade: { type: 'boolean' },
        maxScore: { type: 'number', nullable: true },
        dueDate: { type: 'string', format: 'date' },
        files: { type: 'array', items: { type: 'string', format: 'binary' } }
      }
    }
  })
  @ApiParam({ name: 'id', description: 'Identificador unico de la tarea' })
  @ApiOkResponse({ type: Task })
  updateTask(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @Req() request: { schoolId?: string },
    @UploadedFiles() files?: Array<{ originalname: string; buffer: Buffer; mimetype?: string }>
  ) {
    return this.tasksService.updateTask(id, this.normalizeUpdateTaskDto(dto), request.schoolId!, files ?? []);
  }

  @Delete('tasks/:id')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Eliminar una tarea' })
  @ApiParam({ name: 'id', description: 'Identificador unico de la tarea' })
  @ApiOkResponse({ type: MessageResponseDto })
  async deleteTask(@Param('id') id: string, @Req() request: { schoolId?: string }) {
    await this.tasksService.deleteTask(id, request.schoolId!);
    return { message: 'Tarea eliminada correctamente' };
  }

  private normalizeCreateTaskDto(dto: CreateTaskDto): CreateTaskDto {
    return {
      ...dto,
      affectsGrade: dto.affectsGrade === true || `${dto.affectsGrade}` === 'true',
      maxScore: dto.maxScore === undefined || dto.maxScore === null || `${dto.maxScore}` === '' ? null : Number(dto.maxScore)
    };
  }

  private normalizeUpdateTaskDto(dto: UpdateTaskDto): UpdateTaskDto {
    return {
      ...dto,
      affectsGrade:
        dto.affectsGrade === undefined ? undefined : dto.affectsGrade === true || `${dto.affectsGrade}` === 'true',
      maxScore:
        dto.maxScore === undefined || dto.maxScore === null || `${dto.maxScore}` === ''
          ? dto.maxScore === undefined
            ? undefined
            : null
          : Number(dto.maxScore)
    };
  }
}
