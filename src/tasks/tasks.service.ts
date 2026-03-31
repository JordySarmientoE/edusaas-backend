import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { In } from 'typeorm';
import { ClassesService } from '../classes/classes.service';
import { PaginatedResultDto } from '../common/dto/paginated-result.dto';
import { paginate } from '../common/helpers/paginate.helper';
import { StorageService } from '../common/services/storage.service';
import { GradeScale } from '../school-config/entities/school-config.entity';
import { SchoolConfigService } from '../school-config/school-config.service';
import { UsersService } from '../users/users.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { GradeTaskDto } from './dto/grade-task.dto';
import { ParentTaskDto } from './dto/parent-task.dto';
import { StudentTaskDto } from './dto/student-task.dto';
import { SubmitTaskDto } from './dto/submit-task.dto';
import { TaskFiltersDto } from './dto/task-filters.dto';
import { TaskGradebookResponseDto } from './dto/task-gradebook-response.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskGrade } from './entities/task-grade.entity';
import { TaskSubmission, TaskSubmissionStatus } from './entities/task-submission.entity';
import { Task, TaskSubmissionMode } from './entities/task.entity';
import {
  TaskClassGradeConfigsRepository,
  TaskGradesRepository,
  TaskParentLinksRepository,
  TaskSubmissionsRepository,
  TasksRepository,
  TaskStudentAssignmentsRepository
} from './repositories';

@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly taskGradesRepository: TaskGradesRepository,
    private readonly taskSubmissionsRepository: TaskSubmissionsRepository,
    private readonly studentClassAssignmentsRepository: TaskStudentAssignmentsRepository,
    private readonly parentStudentLinksRepository: TaskParentLinksRepository,
    private readonly taskClassGradeConfigsRepository: TaskClassGradeConfigsRepository,
    @Inject(forwardRef(() => ClassesService))
    private readonly classesService: ClassesService,
    private readonly storageService: StorageService,
    private readonly usersService: UsersService,
    private readonly schoolConfigService: SchoolConfigService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async createTask(
    dto: CreateTaskDto,
    schoolId: string,
    teacherId?: string,
    files: Array<{ originalname: string; buffer: Buffer; mimetype?: string }> = []
  ): Promise<Task> {
    await this.classesService.findById(dto.classId, schoolId);
    const storedAttachments = await Promise.all(files.map((file) => this.storageService.storeAttachment(file, 'tasks')));
    const primaryAttachment = storedAttachments[0] ?? null;
    const task = this.tasksRepository.create({
      schoolId,
      classId: dto.classId,
      teacherId: teacherId ?? null,
      title: dto.title,
      description: dto.description,
      taskType: dto.taskType,
      submissionMode: dto.submissionMode,
      affectsGrade: dto.affectsGrade,
      maxScore: dto.maxScore ?? null,
      attachmentUrl: primaryAttachment?.url ?? null,
      attachmentName: primaryAttachment?.name ?? null,
      attachmentMimeType: primaryAttachment?.mimeType ?? null,
      attachmentStorageKey: primaryAttachment?.key ?? null,
      attachments: storedAttachments,
      dueDate: dto.dueDate
    });

    const savedTask = await this.tasksRepository.save(task);
    this.eventEmitter.emit('task.created', {
      schoolId,
      classId: dto.classId,
      taskId: savedTask.id,
      title: savedTask.title,
      taskType: savedTask.taskType
    });

    return savedTask;
  }

  async findByClass(classId: string, schoolId: string, filters: TaskFiltersDto): Promise<PaginatedResultDto<Task>> {
    await this.classesService.findById(classId, schoolId);
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const query = this.tasksRepository
      .createQueryBuilder('task')
      .where('task.schoolId = :schoolId', { schoolId })
      .andWhere('task.classId = :classId', { classId })
      .orderBy('task.dueDate', 'ASC')
      .addOrderBy('task.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await query.getManyAndCount();
    return paginate(data, total, page, limit);
  }

  async getTaskGradebook(taskId: string, schoolId: string): Promise<TaskGradebookResponseDto> {
    const task = await this.findById(taskId, schoolId);
    const students = await this.usersService.getStudentsByClass(task.classId, schoolId);
    const grades = await this.taskGradesRepository.find({
      where: { schoolId, taskId }
    });
    const submissions = await this.taskSubmissionsRepository.find({
      where: { schoolId, taskId }
    });
    const gradesByStudentId = new Map(grades.map((grade) => [grade.studentId, grade]));
    const submissionsByStudentId = new Map(submissions.map((submission) => [submission.studentId, submission]));

    return {
      task,
      students: students.map((student) => {
        const grade = gradesByStudentId.get(student.id);
        const submission = submissionsByStudentId.get(student.id);
        return {
          studentId: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          rawScore: grade?.rawScore ?? null,
          scaledScore: grade?.scaledScore ?? null,
          feedback: grade?.feedback ?? null,
          gradedAt: grade?.gradedAt ?? null,
          submissionStatus: submission?.status ?? TaskSubmissionStatus.PENDING,
          submissionContent: submission?.content ?? null,
          submittedAt: submission?.submittedAt ?? null
        };
      })
    };
  }

  async gradeTask(taskId: string, dto: GradeTaskDto, schoolId: string): Promise<TaskGrade[]> {
    const task = await this.findById(taskId, schoolId);
    const classConfig = await this.taskClassGradeConfigsRepository.findOne({
      where: { schoolId, classId: task.classId }
    });

    if (classConfig?.isClosed) {
      throw new ConflictException('La calificación está cerrada para esta clase');
    }

    const students = await this.usersService.getStudentsByClass(task.classId, schoolId);
    const validStudentIds = new Set(students.map((student) => student.id));

    for (const grade of dto.grades) {
      if (!validStudentIds.has(grade.studentId)) {
        throw new BadRequestException('Uno de los alumnos no pertenece a la clase de la tarea');
      }
      if (grade.rawScore < 0) {
        throw new BadRequestException('La nota no puede ser negativa');
      }
      if (task.maxScore !== null && grade.rawScore > Number(task.maxScore)) {
        throw new BadRequestException('La nota excede el puntaje máximo configurado para la actividad');
      }
    }

    const existingGrades = await this.taskGradesRepository.find({
      where: { schoolId, taskId }
    });
    const existingByStudentId = new Map(existingGrades.map((grade) => [grade.studentId, grade]));
    const gradedAt = new Date();
    const entities = await Promise.all(
      dto.grades.map(async (entry) => {
        const scaledScore = await this.applyGradeScale(entry.rawScore, schoolId);
        const current =
          existingByStudentId.get(entry.studentId) ??
          this.taskGradesRepository.create({
            schoolId,
            taskId,
            studentId: entry.studentId,
            rawScore: entry.rawScore,
            scaledScore: String(scaledScore),
            feedback: entry.feedback?.trim() || null,
            gradedAt
          });

        current.rawScore = entry.rawScore;
        current.scaledScore = String(scaledScore);
        current.feedback = entry.feedback?.trim() || null;
        current.gradedAt = gradedAt;

        return current;
      })
    );

    const savedGrades = await this.taskGradesRepository.save(entities);

    this.eventEmitter.emit('task.graded', {
      schoolId,
      taskId,
      classId: task.classId,
      title: task.title,
      taskType: task.taskType,
      studentIds: savedGrades.map((grade) => grade.studentId)
    });

    return savedGrades;
  }

  async findByStudent(studentId: string, schoolId: string): Promise<StudentTaskDto[]> {
    await this.usersService.findById(studentId, schoolId);
    const assignments = await this.studentClassAssignmentsRepository.find({
      where: { schoolId, studentId }
    });
    if (assignments.length === 0) {
      return [];
    }

    const tasks = await this.tasksRepository
      .createQueryBuilder('task')
      .where('task.schoolId = :schoolId', { schoolId })
      .andWhere('task.classId IN (:...classIds)', { classIds: assignments.map((a) => a.classId) })
      .orderBy('task.dueDate', 'ASC')
      .addOrderBy('task.createdAt', 'DESC')
      .getMany();

    if (tasks.length === 0) {
      return [];
    }

    const grades = await this.taskGradesRepository.find({
      where: {
        schoolId,
        studentId
      }
    });
    const gradesByTaskId = new Map(grades.map((grade) => [grade.taskId, grade]));

    return tasks.map((task) => {
      const grade = gradesByTaskId.get(task.id);

      return {
        ...task,
        myRawScore: grade?.rawScore ?? null,
        myScaledScore: grade?.scaledScore ?? null,
        myFeedback: grade?.feedback ?? null,
        myGradedAt: grade?.gradedAt ?? null
      };
    });
  }

  async getMySubmission(taskId: string, studentId: string, schoolId: string): Promise<TaskSubmission | null> {
    const task = await this.findById(taskId, schoolId);
    const students = await this.usersService.getStudentsByClass(task.classId, schoolId);

    if (!students.some((student) => student.id === studentId)) {
      throw new BadRequestException('No perteneces a la clase de esta actividad');
    }

    return this.taskSubmissionsRepository.findOne({
      where: { schoolId, taskId, studentId }
    });
  }

  async submitTask(taskId: string, dto: SubmitTaskDto, studentId: string, schoolId: string): Promise<TaskSubmission> {
    const task = await this.findById(taskId, schoolId);

    if (task.submissionMode !== TaskSubmissionMode.STUDENT_SUBMISSION) {
      throw new BadRequestException('Esta actividad no requiere entrega del alumno');
    }

    const students = await this.usersService.getStudentsByClass(task.classId, schoolId);

    if (!students.some((student) => student.id === studentId)) {
      throw new BadRequestException('No perteneces a la clase de esta actividad');
    }

    const submittedAt = new Date();
    const dueDate = new Date(`${task.dueDate}T23:59:59`);
    const status =
      submittedAt.getTime() <= dueDate.getTime() ? TaskSubmissionStatus.SUBMITTED : TaskSubmissionStatus.LATE;

    const submission =
      (await this.taskSubmissionsRepository.findOne({
        where: { schoolId, taskId, studentId }
      })) ??
      this.taskSubmissionsRepository.create({
        schoolId,
        taskId,
        studentId,
        content: null,
        status: TaskSubmissionStatus.PENDING,
        submittedAt: null
      });

    submission.content = dto.content?.trim() || null;
    submission.status = status;
    submission.submittedAt = submittedAt;

    return this.taskSubmissionsRepository.save(submission);
  }

  async findByParent(parentId: string, schoolId: string): Promise<ParentTaskDto[]> {
    await this.usersService.findById(parentId, schoolId);
    await this.usersService.ensureUserCanAccessLinkedStudentsInSchool(parentId, schoolId);

    const links = await this.parentStudentLinksRepository.find({
      where: { schoolId, parentId }
    });

    if (links.length === 0) {
      return [];
    }

    const studentIds = links.map((link) => link.studentId);
    const assignments = await this.studentClassAssignmentsRepository
      .createQueryBuilder('assignment')
      .where('assignment.schoolId = :schoolId', { schoolId })
      .andWhere('assignment.studentId IN (:...studentIds)', { studentIds })
      .getMany();

    if (assignments.length === 0) {
      return [];
    }

    const classIds = [...new Set(assignments.map((assignment) => assignment.classId))];
    const [tasks, students, grades, submissions] = await Promise.all([
      this.tasksRepository
      .createQueryBuilder('task')
      .where('task.schoolId = :schoolId', { schoolId })
      .andWhere('task.classId IN (:...classIds)', { classIds })
      .orderBy('task.dueDate', 'ASC')
      .addOrderBy('task.createdAt', 'DESC')
      .getMany(),
      Promise.all(studentIds.map((studentId) => this.usersService.findById(studentId, schoolId))),
      this.taskGradesRepository.find({
        where: {
          schoolId,
          studentId: In(studentIds)
        }
      }),
      this.taskSubmissionsRepository.find({
        where: {
          schoolId,
          studentId: In(studentIds)
        }
      })
    ]);

    const classIdsByStudentId = new Map<string, string[]>();
    for (const assignment of assignments) {
      const current = classIdsByStudentId.get(assignment.studentId) ?? [];
      current.push(assignment.classId);
      classIdsByStudentId.set(assignment.studentId, current);
    }

    const gradesByKey = new Map(grades.map((grade) => [`${grade.taskId}:${grade.studentId}`, grade] as const));
    const submissionsByKey = new Map(
      submissions.map((submission) => [`${submission.taskId}:${submission.studentId}`, submission] as const)
    );

    return students.flatMap((student) => {
      const allowedClassIds = new Set(classIdsByStudentId.get(student.id) ?? []);
      return tasks
        .filter((task) => allowedClassIds.has(task.classId))
        .map((task) => {
          const grade = gradesByKey.get(`${task.id}:${student.id}`);
          const submission = submissionsByKey.get(`${task.id}:${student.id}`);

          return {
            ...task,
            studentId: student.id,
            studentFirstName: student.firstName,
            studentLastName: student.lastName,
            myRawScore: grade?.rawScore ?? null,
            myScaledScore: grade?.scaledScore ?? null,
            myFeedback: grade?.feedback ?? null,
            myGradedAt: grade?.gradedAt ?? null,
            submissionStatus: submission?.status ?? TaskSubmissionStatus.PENDING,
            submissionContent: submission?.content ?? null,
            submittedAt: submission?.submittedAt ?? null
          };
        });
    }).sort((left, right) => {
      const dueDiff = new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime();
      if (dueDiff !== 0) {
        return dueDiff;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }

  async updateTask(
    id: string,
    dto: UpdateTaskDto,
    schoolId: string,
    files: Array<{ originalname: string; buffer: Buffer; mimetype?: string }> = []
  ): Promise<Task> {
    const task = await this.findById(id, schoolId);
    const storedAttachments = await Promise.all(files.map((file) => this.storageService.storeAttachment(file, 'tasks')));
    const currentAttachments = task.attachments ?? [];
    const keptAttachments =
      dto.keepAttachmentKeys === undefined
        ? currentAttachments
        : currentAttachments.filter((attachment) => dto.keepAttachmentKeys?.includes(attachment.key));
    if (dto.maxScore !== undefined) {
      task.maxScore = dto.maxScore ?? null;
    }
    Object.assign(task, dto);

    const mergedAttachments = [...keptAttachments, ...storedAttachments];
    const primaryAttachment = mergedAttachments[0] ?? null;
    task.attachments = mergedAttachments;
    task.attachmentUrl = primaryAttachment?.url ?? null;
    task.attachmentName = primaryAttachment?.name ?? null;
    task.attachmentMimeType = primaryAttachment?.mimeType ?? null;
    task.attachmentStorageKey = primaryAttachment?.key ?? null;

    return this.tasksRepository.save(task);
  }

  async deleteTask(id: string, schoolId: string): Promise<void> {
    const task = await this.findById(id, schoolId);
    await this.tasksRepository.remove(task);
  }

  async findById(id: string, schoolId: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({ where: { id, schoolId } });
    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }
    return task;
  }

  private async applyGradeScale(rawScore: number, schoolId: string): Promise<string | number> {
    const config = await this.schoolConfigService.getConfig(schoolId);

    switch (config.gradingScale) {
      case GradeScale.NUMERIC_10:
        return Math.min(10, Number((rawScore / 2).toFixed(2)));
      case GradeScale.LITERAL:
        if (rawScore >= 18) return 'A';
        if (rawScore >= 15) return 'B';
        if (rawScore >= 12) return 'C';
        if (rawScore >= 10) return 'D';
        return 'F';
      case GradeScale.NUMERIC_20:
      default:
        return Number(rawScore.toFixed(2));
    }
  }
}
