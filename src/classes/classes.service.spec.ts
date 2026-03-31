import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { AcademicCyclesService } from '../academic-cycles/academic-cycles.service';
import { Role } from '../common/enums/role.enum';
import { UsersService } from '../users/users.service';
import { ClassesService } from './classes.service';
import { SchoolClass } from './entities/class.entity';
import { Schedule } from './entities/schedule.entity';
import { SchedulesRepository, SchoolClassesRepository } from './repositories';

describe('ClassesService', () => {
  let service: ClassesService;
  let classesRepository: jest.Mocked<Repository<SchoolClass>>;
  let schedulesRepository: jest.Mocked<Repository<Schedule>>;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const enrollmentsRepository = {
      find: jest.fn().mockResolvedValue([])
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ClassesService,
        {
          provide: SchoolClassesRepository,
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
            manager: {
              getRepository: jest.fn(() => enrollmentsRepository)
            }
          }
        },
        {
          provide: SchedulesRepository,
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn()
          }
        },
        {
          provide: AcademicCyclesService,
          useValue: {
            findById: jest.fn().mockResolvedValue({ id: 'cycle-1' }),
            findGradeById: jest.fn().mockResolvedValue({ id: 'grade-1', name: 'Primaria 1' }),
            findSectionById: jest.fn().mockResolvedValue({ id: 'section-1', gradeId: 'grade-1', cycleId: 'cycle-1', name: 'A' }),
            findCourseById: jest.fn().mockResolvedValue({ id: 'course-1', name: 'Matemática' })
          }
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(),
            ensureUserHasRoleInSchool: jest.fn()
          }
        }
      ]
    }).compile();

    service = moduleRef.get(ClassesService);
    classesRepository = moduleRef.get(SchoolClassesRepository);
    schedulesRepository = moduleRef.get(SchedulesRepository);
    usersService = moduleRef.get(UsersService);
  });

  it('creates a class', async () => {
    classesRepository.create.mockReturnValue({ name: 'Matemática' } as SchoolClass);
    classesRepository.save.mockResolvedValue({ id: 'class-1', name: 'Matemática' } as SchoolClass);

    const result = await service.createClass(
      {
        cycleId: 'cycle-1',
        gradeId: 'grade-1',
        sectionId: 'section-1',
        courseId: 'course-1',
        name: 'Matemática',
        subject: 'Álgebra'
      },
      'school-1'
    );

    expect(result.id).toBe('class-1');
  });

  it('assigns a teacher to the class', async () => {
    classesRepository.findOne.mockResolvedValue({ id: 'class-1', schoolId: 'school-1' } as SchoolClass);
    usersService.findById.mockResolvedValue({ id: 'teacher-1', role: Role.TEACHER } as never);
    usersService.ensureUserHasRoleInSchool.mockResolvedValue(Role.TEACHER as never);

    await service.assignTeacher('class-1', { teacherId: 'teacher-1' }, 'school-1');

    expect(classesRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ teacherId: 'teacher-1' })
    );
  });

  it('rejects assigning a non-teacher user', async () => {
    classesRepository.findOne.mockResolvedValue({ id: 'class-1', schoolId: 'school-1' } as SchoolClass);
    usersService.findById.mockResolvedValue({ id: 'user-1', role: Role.STUDENT } as never);
    usersService.ensureUserHasRoleInSchool.mockRejectedValue(new ConflictException('Rol no permitido'));

    await expect(service.assignTeacher('class-1', { teacherId: 'user-1' }, 'school-1')).rejects.toThrow(
      ConflictException
    );
  });

  it('creates schedules', async () => {
    classesRepository.findOne.mockResolvedValue({ id: 'class-1', schoolId: 'school-1' } as SchoolClass);
    schedulesRepository.find.mockResolvedValue([]);
    schedulesRepository.create.mockReturnValue({ classId: 'class-1' } as Schedule);
    schedulesRepository.save.mockResolvedValue({ id: 'schedule-1', classId: 'class-1' } as Schedule);

    const result = await service.setSchedule(
      'class-1',
      { dayOfWeek: 'MONDAY', startTime: '08:00', endTime: '09:00' },
      'school-1'
    );

    expect(result.id).toBe('schedule-1');
  });

  it('throws when the class does not exist', async () => {
    classesRepository.findOne.mockResolvedValue(null);
    await expect(service.findById('missing', 'school-1')).rejects.toThrow(NotFoundException);
  });

  it('returns teacher schedule through query builder', async () => {
    usersService.findById.mockResolvedValue({ id: 'teacher-1' } as never);
    usersService.ensureUserHasRoleInSchool.mockResolvedValue(Role.TEACHER as never);
    const queryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ id: 'schedule-1' }])
    };
    schedulesRepository.createQueryBuilder.mockReturnValue(queryBuilder as never);

    const result = await service.getTeacherSchedule('teacher-1', 'school-1');

    expect(result).toHaveLength(1);
  });

  it('checks student access through class query builder', async () => {
    const queryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: 'class-1' })
    };
    classesRepository.createQueryBuilder.mockReturnValue(queryBuilder as never);

    await expect(service.studentHasClassAccess('class-1', 'student-1', 'school-1')).resolves.toBe(true);
  });

  it('rejects invalid and overlapping schedules', async () => {
    classesRepository.findOne.mockResolvedValue({ id: 'class-1', schoolId: 'school-1' } as SchoolClass);

    await expect(
      service.setSchedule('class-1', { dayOfWeek: 'MONDAY', startTime: '10:00', endTime: '09:00' }, 'school-1')
    ).rejects.toThrow(BadRequestException);

    schedulesRepository.find.mockResolvedValue([
      { id: 'schedule-1', classId: 'class-1', startTime: '08:30', endTime: '09:30', dayOfWeek: 'MONDAY' }
    ] as never);

    await expect(
      service.setSchedule('class-1', { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '10:00' }, 'school-1')
    ).rejects.toThrow(ConflictException);
  });
});
