import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { AcademicCyclesService } from '../academic-cycles/academic-cycles.service';
import { AttendanceStatus } from '../attendance/entities/attendance-record.entity';
import { ClassesService } from '../classes/classes.service';
import { GradeScale } from '../school-config/entities/school-config.entity';
import { SchoolConfigService } from '../school-config/school-config.service';
import { UsersService } from '../users/users.service';
import { ParentStudentLink } from '../users/entities/parent-student-link.entity';
import { GradeRecord } from './entities/grade-record.entity';
import { GradesService } from './grades.service';
import {
  ClassGradeConfigsRepository,
  GradeAttendanceRecordsRepository,
  GradeParentLinksRepository,
  GradeRecordsRepository,
  GradeTaskGradesRepository,
  GradeTasksRepository,
  GradeUsersRepository
} from './repositories';

describe('GradesService', () => {
  let service: GradesService;
  let gradesRepository: jest.Mocked<Repository<GradeRecord>>;
  let parentLinksRepository: jest.Mocked<Repository<ParentStudentLink>>;
  let classConfigsRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let schoolConfigService: {
    getConfig: jest.Mock;
  };
  let usersService: {
    findById: jest.Mock;
    ensureUserCanAccessLinkedStudentsInSchool: jest.Mock;
    getStudentsByClass: jest.Mock;
    getLinkedStudentsForParent: jest.Mock;
  };
  let gradeAttendanceRecordsRepository: { find: jest.Mock };
  let gradeTaskGradesRepository: { find: jest.Mock; createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        GradesService,
        {
          provide: GradeRecordsRepository,
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn()
          }
        },
        {
          provide: GradeParentLinksRepository,
          useValue: {
            find: jest.fn()
          }
        },
        {
          provide: ClassGradeConfigsRepository,
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn()
          }
        },
        {
          provide: GradeAttendanceRecordsRepository,
          useValue: {
            find: jest.fn()
          }
        },
        {
          provide: GradeTasksRepository,
          useValue: {
            find: jest.fn()
          }
        },
        {
          provide: GradeTaskGradesRepository,
          useValue: {
            find: jest.fn(),
            createQueryBuilder: jest.fn()
          }
        },
        {
          provide: GradeUsersRepository,
          useValue: {
            find: jest.fn(),
            findOneOrFail: jest.fn()
          }
        },
        {
          provide: ClassesService,
          useValue: {
            findById: jest.fn().mockResolvedValue({ id: 'class-1', cycleId: 'cycle-1' }),
            findStudentClasses: jest.fn().mockResolvedValue([])
          }
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({ id: 'student-1' }),
            ensureUserCanAccessLinkedStudentsInSchool: jest.fn(),
            getStudentsByClass: jest.fn().mockResolvedValue([]),
            getLinkedStudentsForParent: jest.fn().mockResolvedValue([])
          }
        },
        {
          provide: SchoolConfigService,
          useValue: {
            getConfig: jest.fn().mockResolvedValue({ gradingScale: GradeScale.NUMERIC_20 })
          }
        },
        {
          provide: AcademicCyclesService,
          useValue: {
            findById: jest.fn().mockResolvedValue({ id: 'cycle-1' })
          }
        }
      ]
    }).compile();

    service = moduleRef.get(GradesService);
    gradesRepository = moduleRef.get(GradeRecordsRepository);
    parentLinksRepository = moduleRef.get(GradeParentLinksRepository);
    classConfigsRepository = moduleRef.get(ClassGradeConfigsRepository);
    schoolConfigService = moduleRef.get(SchoolConfigService);
    usersService = moduleRef.get(UsersService);
    gradeAttendanceRecordsRepository = moduleRef.get(GradeAttendanceRecordsRepository);
    gradeTaskGradesRepository = moduleRef.get(GradeTaskGradesRepository);
  });

  it('registers a grade', async () => {
    gradesRepository.findOne.mockResolvedValue(null);
    gradesRepository.create.mockReturnValue({ evaluationName: 'Parcial 1' } as GradeRecord);
    gradesRepository.save.mockResolvedValue({ id: 'grade-1', scaledScore: '18' } as GradeRecord);

    const result = await service.registerGrade(
      {
        classId: 'class-1',
        studentId: 'student-1',
        cycleId: 'cycle-1',
        evaluationName: 'Parcial 1',
        rawScore: 18
      },
      'school-1'
    );

    expect(result.id).toBe('grade-1');
  });

  it('rejects registering a closed grade', async () => {
    gradesRepository.findOne.mockResolvedValue({ id: 'grade-1', isClosed: true } as GradeRecord);

    await expect(
      service.registerGrade(
        {
          classId: 'class-1',
          studentId: 'student-1',
          cycleId: 'cycle-1',
          evaluationName: 'Parcial 1',
          rawScore: 18
        },
        'school-1'
      )
    ).rejects.toThrow(ConflictException);
  });

  it('returns grades for linked children', async () => {
    parentLinksRepository.find.mockResolvedValue([{ studentId: 'student-1' }] as never);
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ id: 'grade-1' }])
    };
    gradesRepository.createQueryBuilder.mockReturnValue(queryBuilder as never);

    const result = await service.getByParent('parent-1', 'school-1');
    expect(result).toHaveLength(1);
  });

  it('creates a class config on demand and can close or reopen it', async () => {
    classConfigsRepository.findOne.mockResolvedValue(null);
    classConfigsRepository.create.mockImplementation((value: object) => ({ id: 'config-1', ...value }));
    classConfigsRepository.save.mockImplementation(async (value: unknown) => value);

    const created = await service.getOrCreateClassConfig('class-1', 'school-1');
    await service.closeClassGrades('class-1', 'school-1');
    await service.reopenClassGrades('class-1', 'school-1');

    expect(created).toEqual(expect.objectContaining({ classId: 'class-1', isClosed: false }));
    expect(classConfigsRepository.save).toHaveBeenCalled();
  });

  it('applies alternate grading scales', async () => {
    schoolConfigService.getConfig.mockResolvedValueOnce({ gradingScale: GradeScale.NUMERIC_10 });
    schoolConfigService.getConfig.mockResolvedValueOnce({ gradingScale: GradeScale.LITERAL });

    await expect(service.applyGradeScale(18, 'school-1')).resolves.toBe(9);
    await expect(service.applyGradeScale(18, 'school-1')).resolves.toBe('A');
  });

  it('returns an empty parent grade list without linked students', async () => {
    parentLinksRepository.find.mockResolvedValue([]);

    await expect(service.getByParent('parent-1', 'school-1')).resolves.toEqual([]);
  });

  it('validates class config weights before saving', async () => {
    await expect(
      service.updateClassConfig(
        'class-1',
        {
          examsWeight: 20,
          participationsWeight: 20,
          tasksWeight: 20,
          passingScore: 11,
          minimumAttendancePercentage: 70
        },
        'school-1'
      )
    ).rejects.toThrow('La suma de ponderaciones debe ser 100');
  });

  it('builds a class summary with grade and attendance status', async () => {
    classConfigsRepository.findOne.mockResolvedValue({
      id: 'config-1',
      classId: 'class-1',
      cycleId: 'cycle-1',
      examsWeight: 20,
      participationsWeight: 30,
      tasksWeight: 50,
      passingScore: 11,
      minimumAttendancePercentage: 70,
      isClosed: false
    });
    usersService.getStudentsByClass.mockResolvedValue([
      { id: 'student-1', firstName: 'Ana', lastName: 'Perez', email: 'ana@example.com' }
    ] as never);
    const queryBuilder = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          studentId: 'student-1',
          rawScore: 18,
          feedback: 'Buen trabajo',
          gradedAt: new Date('2026-03-30T10:00:00.000Z'),
          task: { id: 'task-1', title: 'Parcial', taskType: 'exam', maxScore: 20 }
        },
        {
          studentId: 'student-1',
          rawScore: 16,
          feedback: '',
          gradedAt: new Date('2026-03-29T10:00:00.000Z'),
          task: { id: 'task-2', title: 'Práctica', taskType: 'homework', maxScore: 20 }
        }
      ])
    };
    gradeTaskGradesRepository.createQueryBuilder.mockReturnValue(queryBuilder as never);
    gradeAttendanceRecordsRepository.find.mockResolvedValue([
      { studentId: 'student-1', status: AttendanceStatus.PRESENT },
      { studentId: 'student-1', status: AttendanceStatus.ABSENT },
      { studentId: 'student-1', status: AttendanceStatus.LATE }
    ] as never);

    const result = await service.getClassSummary('class-1', 'school-1');

    expect(result.config.id).toBe('config-1');
    expect(result.students[0]).toEqual(
      expect.objectContaining({
        studentId: 'student-1',
        examsAverage: 18,
        tasksAverage: 16,
        attendancePercentage: 66.67,
        latestFeedback: 'Buen trabajo',
        latestFeedbackTaskTitle: 'Parcial',
        status: 'failed_attendance'
      })
    );
  });
});
