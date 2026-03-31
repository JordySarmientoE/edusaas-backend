import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { ClassesService } from '../classes/classes.service';
import { StorageService } from '../common/services/storage.service';
import { SchoolConfigService } from '../school-config/school-config.service';
import { UsersService } from '../users/users.service';
import { ParentStudentLink } from '../users/entities/parent-student-link.entity';
import { StudentClassAssignment } from '../users/entities/student-class-assignment.entity';
import { Task, TaskSubmissionMode, TaskType } from './entities/task.entity';
import { TasksService } from './tasks.service';
import {
  TaskClassGradeConfigsRepository,
  TaskGradesRepository,
  TaskParentLinksRepository,
  TaskSubmissionsRepository,
  TasksRepository,
  TaskStudentAssignmentsRepository
} from './repositories';

describe('TasksService', () => {
  let service: TasksService;
  let tasksRepository: jest.Mocked<Repository<Task>>;
  let assignmentsRepository: jest.Mocked<Repository<StudentClassAssignment>>;
  let parentLinksRepository: jest.Mocked<Repository<ParentStudentLink>>;
  let usersService: jest.Mocked<UsersService>;
  let taskGradesRepository: { find: jest.Mock; create: jest.Mock; save: jest.Mock };
  let taskSubmissionsRepository: { find: jest.Mock; findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let taskClassGradeConfigsRepository: { findOne: jest.Mock };
  let storageService: { storeAttachment: jest.Mock };
  let schoolConfigService: { getConfig: jest.Mock };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: TasksRepository,
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn()
          }
        },
        {
          provide: TaskGradesRepository,
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn()
          }
        },
        {
          provide: TaskSubmissionsRepository,
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn()
          }
        },
        {
          provide: TaskStudentAssignmentsRepository,
          useValue: {
            find: jest.fn(),
            createQueryBuilder: jest.fn()
          }
        },
        {
          provide: TaskParentLinksRepository,
          useValue: {
            find: jest.fn()
          }
        },
        {
          provide: TaskClassGradeConfigsRepository,
          useValue: {
            findOne: jest.fn()
          }
        },
        {
          provide: ClassesService,
          useValue: {
            findById: jest.fn().mockResolvedValue({ id: 'class-1' })
          }
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({ id: 'student-1' }),
            ensureUserCanAccessLinkedStudentsInSchool: jest.fn(),
            getStudentsByClass: jest.fn().mockResolvedValue([])
          }
        },
        {
          provide: StorageService,
          useValue: {
            storeAttachment: jest.fn()
          }
        },
        {
          provide: SchoolConfigService,
          useValue: {
            getConfig: jest.fn()
          }
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn()
          }
        }
      ]
    }).compile();

    service = moduleRef.get(TasksService);
    tasksRepository = moduleRef.get(TasksRepository);
    assignmentsRepository = moduleRef.get(TaskStudentAssignmentsRepository);
    parentLinksRepository = moduleRef.get(TaskParentLinksRepository);
    usersService = moduleRef.get(UsersService);
    taskGradesRepository = moduleRef.get(TaskGradesRepository);
    taskSubmissionsRepository = moduleRef.get(TaskSubmissionsRepository);
    taskClassGradeConfigsRepository = moduleRef.get(TaskClassGradeConfigsRepository);
    storageService = moduleRef.get(StorageService);
    schoolConfigService = moduleRef.get(SchoolConfigService);
  });

  it('creates a task and emits event', async () => {
    tasksRepository.create.mockReturnValue({ title: 'Tarea 1' } as Task);
    tasksRepository.save.mockResolvedValue({ id: 'task-1', title: 'Tarea 1' } as Task);

    const result = await service.createTask(
      {
        classId: 'class-1',
        title: 'Tarea 1',
        description: 'Resolver ejercicios',
        taskType: TaskType.HOMEWORK,
        submissionMode: TaskSubmissionMode.STUDENT_SUBMISSION,
        affectsGrade: false,
        dueDate: '2026-03-30'
      },
      'school-1',
      'teacher-1'
    );

    expect(result.id).toBe('task-1');
  });

  it('returns tasks by student', async () => {
    assignmentsRepository.find.mockResolvedValue([{ classId: 'class-1' }] as never);
    taskGradesRepository.find.mockResolvedValue([]);
    taskSubmissionsRepository.find.mockResolvedValue([]);
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ id: 'task-1' }])
    };
    tasksRepository.createQueryBuilder.mockReturnValue(queryBuilder as never);

    const result = await service.findByStudent('student-1', 'school-1');
    expect(result).toHaveLength(1);
  });

  it('returns tasks by parent through linked children', async () => {
    usersService.findById.mockImplementation(async (id: string) => {
      if (id === 'parent-1') {
        return { id: 'parent-1', role: 'parent' } as never;
      }

      return {
        id: 'student-1',
        role: 'student',
        firstName: 'Ana',
        lastName: 'Perez'
      } as never;
    });
    parentLinksRepository.find.mockResolvedValue([{ studentId: 'student-1' }] as never);
    taskGradesRepository.find.mockResolvedValue([]);
    taskSubmissionsRepository.find.mockResolvedValue([]);
    const assignmentQuery = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ classId: 'class-1', studentId: 'student-1' }])
    };
    assignmentsRepository.createQueryBuilder.mockReturnValue(assignmentQuery as never);
    const taskQuery = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ id: 'task-1', classId: 'class-1', dueDate: '2026-03-30' }])
    };
    tasksRepository.createQueryBuilder.mockReturnValue(taskQuery as never);

    const result = await service.findByParent('parent-1', 'school-1');
    expect(result).toHaveLength(1);
  });

  it('throws when task is missing', async () => {
    tasksRepository.findOne.mockResolvedValue(null);
    await expect(service.findById('missing', 'school-1')).rejects.toThrow(NotFoundException);
  });

  it('returns empty parent task list without linked children', async () => {
    usersService.findById.mockResolvedValue({ id: 'parent-1', role: 'parent' } as never);
    parentLinksRepository.find.mockResolvedValue([]);

    await expect(service.findByParent('parent-1', 'school-1')).resolves.toEqual([]);
  });

  it('rejects invalid gradebook entries for task grading', async () => {
    tasksRepository.findOne.mockResolvedValue({
      id: 'task-1',
      classId: 'class-1',
      schoolId: 'school-1',
      maxScore: 20
    } as never);
    taskClassGradeConfigsRepository.findOne.mockResolvedValue({ isClosed: false });
    usersService.getStudentsByClass.mockResolvedValue([{ id: 'student-1' }] as never);

    await expect(
      service.gradeTask(
        'task-1',
        { grades: [{ studentId: 'student-1', rawScore: 25 }] } as never,
        'school-1'
      )
    ).rejects.toThrow(BadRequestException);
  });

  it('returns paginated tasks by class', async () => {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[{ id: 'task-1' }], 1])
    };
    tasksRepository.createQueryBuilder.mockReturnValue(queryBuilder as never);

    const result = await service.findByClass('class-1', 'school-1', { page: 1, limit: 10 });

    expect(result.total).toBe(1);
    expect(result.data[0].id).toBe('task-1');
  });

  it('returns the task gradebook with default submission state', async () => {
    tasksRepository.findOne.mockResolvedValue({
      id: 'task-1',
      classId: 'class-1',
      schoolId: 'school-1'
    } as never);
    usersService.getStudentsByClass.mockResolvedValue([
      { id: 'student-1', firstName: 'Ana', lastName: 'Perez', email: 'ana@example.com' }
    ] as never);
    taskGradesRepository.find.mockResolvedValue([
      { taskId: 'task-1', studentId: 'student-1', rawScore: 18, scaledScore: '18' }
    ] as never);
    taskSubmissionsRepository.find.mockResolvedValue([]);

    const result = await service.getTaskGradebook('task-1', 'school-1');

    expect(result.students[0]).toEqual(
      expect.objectContaining({
        studentId: 'student-1',
        rawScore: 18,
        submissionStatus: 'pending'
      })
    );
  });

  it('rejects grading when the class gradebook is closed', async () => {
    tasksRepository.findOne.mockResolvedValue({
      id: 'task-1',
      classId: 'class-1',
      schoolId: 'school-1'
    } as never);
    taskClassGradeConfigsRepository.findOne.mockResolvedValue({ isClosed: true });

    await expect(
      service.gradeTask('task-1', { grades: [{ studentId: 'student-1', rawScore: 18 }] } as never, 'school-1')
    ).rejects.toThrow('La calificación está cerrada para esta clase');
  });

  it('submits a task for a valid student and trims the content', async () => {
    tasksRepository.findOne.mockResolvedValue({
      id: 'task-1',
      classId: 'class-1',
      schoolId: 'school-1',
      dueDate: '2099-12-31',
      submissionMode: TaskSubmissionMode.STUDENT_SUBMISSION
    } as never);
    usersService.getStudentsByClass.mockResolvedValue([{ id: 'student-1' }] as never);
    taskSubmissionsRepository.findOne.mockResolvedValue(null);
    taskSubmissionsRepository.create.mockImplementation((value: object) => value);
    taskSubmissionsRepository.save.mockImplementation(async (value: unknown) => value);

    const result = await service.submitTask(
      'task-1',
      { content: '  Mi respuesta  ' },
      'student-1',
      'school-1'
    );

    expect(result).toEqual(
      expect.objectContaining({
        content: 'Mi respuesta',
        status: 'submitted'
      })
    );
  });

  it('updates task attachments keeping selected ones', async () => {
    tasksRepository.findOne.mockResolvedValue({
      id: 'task-1',
      classId: 'class-1',
      schoolId: 'school-1',
      attachments: [
        { key: 'old-1', url: '/old-1', name: 'old-1.pdf', mimeType: 'application/pdf' },
        { key: 'old-2', url: '/old-2', name: 'old-2.pdf', mimeType: 'application/pdf' }
      ]
    } as never);
    storageService.storeAttachment.mockResolvedValue({
      key: 'new-1',
      url: '/new-1',
      name: 'new-1.pdf',
      mimeType: 'application/pdf'
    });
    tasksRepository.save.mockImplementation(async (value) => value as never);

    const result = await service.updateTask(
      'task-1',
      { keepAttachmentKeys: ['old-2'], maxScore: null } as never,
      'school-1',
      [{ originalname: 'new-1.pdf', buffer: Buffer.from('x') }]
    );

    expect(result.attachments).toEqual([
      { key: 'old-2', url: '/old-2', name: 'old-2.pdf', mimeType: 'application/pdf' },
      { key: 'new-1', url: '/new-1', name: 'new-1.pdf', mimeType: 'application/pdf' }
    ]);
    expect(result.attachmentStorageKey).toBe('old-2');
  });

  it('applies the configured grade scale when grading a task', async () => {
    tasksRepository.findOne.mockResolvedValue({
      id: 'task-1',
      classId: 'class-1',
      schoolId: 'school-1',
      maxScore: 20,
      title: 'Tarea 1',
      taskType: TaskType.HOMEWORK
    } as never);
    taskClassGradeConfigsRepository.findOne.mockResolvedValue({ isClosed: false });
    usersService.getStudentsByClass.mockResolvedValue([{ id: 'student-1' }] as never);
    taskGradesRepository.find.mockResolvedValue([]);
    taskGradesRepository.create.mockImplementation((value) => value as never);
    taskGradesRepository.save.mockImplementation(async (value) => value as never);
    schoolConfigService.getConfig.mockResolvedValue({ gradingScale: 'numeric_10' });

    const result = await service.gradeTask(
      'task-1',
      { grades: [{ studentId: 'student-1', rawScore: 18, feedback: ' bien ' }] } as never,
      'school-1'
    );

    expect(result[0]).toEqual(
      expect.objectContaining({
        rawScore: 18,
        scaledScore: '9',
        feedback: 'bien'
      })
    );
  });
});
