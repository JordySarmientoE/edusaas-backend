import { ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { ClassesService } from '../classes/classes.service';
import { UsersService } from '../users/users.service';
import { ParentStudentLink } from '../users/entities/parent-student-link.entity';
import { StudentClassAssignment } from '../users/entities/student-class-assignment.entity';
import { AttendanceService } from './attendance.service';
import { AttendanceRecord, AttendanceStatus } from './entities/attendance-record.entity';
import {
  AttendanceParentLinksRepository,
  AttendanceRecordsRepository,
  AttendanceStudentAssignmentsRepository
} from './repositories';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let attendanceRepository: jest.Mocked<Repository<AttendanceRecord>>;
  let parentLinksRepository: jest.Mocked<Repository<ParentStudentLink>>;
  let assignmentsRepository: jest.Mocked<Repository<StudentClassAssignment>>;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: AttendanceRecordsRepository,
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn()
          }
        },
        {
          provide: AttendanceStudentAssignmentsRepository,
          useValue: {
            findOne: jest.fn()
          }
        },
        {
          provide: AttendanceParentLinksRepository,
          useValue: {
            find: jest.fn()
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
            findById: jest.fn(),
            ensureUserHasRoleInSchool: jest.fn(),
            ensureUserCanAccessLinkedStudentsInSchool: jest.fn()
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

    service = moduleRef.get(AttendanceService);
    attendanceRepository = moduleRef.get(AttendanceRecordsRepository);
    assignmentsRepository = moduleRef.get(AttendanceStudentAssignmentsRepository);
    parentLinksRepository = moduleRef.get(AttendanceParentLinksRepository);
    usersService = moduleRef.get(UsersService);
  });

  it('takes attendance for students assigned to a class', async () => {
    usersService.findById.mockResolvedValue({ id: 'student-1', role: 'student' } as never);
    assignmentsRepository.findOne.mockResolvedValue({ id: 'assign-1' } as never);
    attendanceRepository.findOne.mockResolvedValue(null);
    attendanceRepository.create.mockReturnValue({ studentId: 'student-1' } as AttendanceRecord);
    attendanceRepository.save.mockResolvedValue({ id: 'attendance-1' } as AttendanceRecord);

    const result = await service.takeAttendance(
      {
        classId: 'class-1',
        attendanceDate: '2026-03-28',
        records: [{ studentId: 'student-1', status: AttendanceStatus.PRESENT }]
      },
      'school-1'
    );

    expect(result).toHaveLength(1);
  });

  it('rejects attendance for students not assigned to the class', async () => {
    usersService.findById.mockResolvedValue({ id: 'student-1', role: 'student' } as never);
    assignmentsRepository.findOne.mockResolvedValue(null);

    await expect(
      service.takeAttendance(
        {
          classId: 'class-1',
          attendanceDate: '2026-03-28',
          records: [{ studentId: 'student-1', status: AttendanceStatus.ABSENT }]
        },
        'school-1'
      )
    ).rejects.toThrow(ConflictException);
  });

  it('returns attendance history by student', async () => {
    usersService.findById.mockResolvedValue({ id: 'student-1', role: 'student' } as never);
    attendanceRepository.find.mockResolvedValue([{ id: 'attendance-1' }] as never);

    const result = await service.getByStudent('student-1', 'school-1');

    expect(result).toHaveLength(1);
  });

  it('returns attendance for linked children when parent requests it', async () => {
    usersService.findById.mockResolvedValue({ id: 'parent-1', role: 'parent' } as never);
    parentLinksRepository.find.mockResolvedValue([{ studentId: 'student-1' }] as never);
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ id: 'attendance-1' }])
    };
    attendanceRepository.createQueryBuilder.mockReturnValue(queryBuilder as never);

    const result = await service.getByParent('parent-1', 'school-1');

    expect(result).toHaveLength(1);
  });
});
