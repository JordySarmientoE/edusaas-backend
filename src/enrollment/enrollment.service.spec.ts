import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { AcademicCyclesService } from '../academic-cycles/academic-cycles.service';
import { Role } from '../common/enums/role.enum';
import { UsersService } from '../users/users.service';
import { EnrollmentService } from './enrollment.service';
import { Enrollment, EnrollmentStatus } from './entities/enrollment.entity';
import { EnrollmentsRepository } from './repositories';

describe('EnrollmentService', () => {
  let service: EnrollmentService;
  let repository: jest.Mocked<Repository<Enrollment>>;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        EnrollmentService,
        {
          provide: EnrollmentsRepository,
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn()
          }
        },
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            createUser: jest.fn(),
            createGlobalUser: jest.fn(),
            createMembership: jest.fn()
          }
        },
        {
          provide: AcademicCyclesService,
          useValue: {
            findById: jest.fn().mockResolvedValue({ id: 'cycle-1', name: '2026' }),
            findSectionStructure: jest.fn().mockResolvedValue({
              section: { id: 'section-1', cycleId: 'cycle-1', isActive: true },
              grade: { id: 'grade-1', isActive: true }
            })
          }
        }
      ]
    }).compile();

    service = moduleRef.get(EnrollmentService);
    repository = moduleRef.get(EnrollmentsRepository);
    usersService = moduleRef.get(UsersService);
  });

  it('creates an enrollment', async () => {
    usersService.findActiveMembershipByEmailInSchool = jest.fn().mockResolvedValue({
      userId: 'student-1',
      user: {
        firstName: 'Ana',
        lastName: 'Perez',
        email: 'ana@example.com',
        phoneNumber: null
      }
    } as never);
    repository.findOne.mockResolvedValue(null);
    repository.create.mockReturnValue({ email: 'ana@example.com' } as Enrollment);
    repository.save.mockResolvedValue({ id: 'enroll-1', email: 'ana@example.com' } as Enrollment);

    const result = await service.createEnrollment(
      {
        cycleId: 'cycle-1',
        sectionId: 'section-1',
        email: 'ana@example.com'
      },
      'school-1'
    );

    expect(result.id).toBe('enroll-1');
  });

  it('accepts an enrollment and creates a student user', async () => {
    repository.findOne.mockResolvedValue({
      id: 'enroll-1',
      schoolId: 'school-1',
      cycleId: 'cycle-1',
      firstName: 'Ana',
      lastName: 'Perez',
      email: 'ana@example.com',
      phoneNumber: null,
      status: EnrollmentStatus.PENDING,
      studentUserId: null
    } as Enrollment);
    usersService.findByEmail.mockResolvedValue(null);
    usersService.createGlobalUser.mockResolvedValue({ id: 'student-1', role: Role.STUDENT } as never);
    usersService.createMembership.mockResolvedValue({ id: 'membership-1' } as never);
    repository.save.mockResolvedValue({
      id: 'enroll-1',
      status: EnrollmentStatus.ACCEPTED,
      studentUserId: 'student-1'
    } as Enrollment);

    const result = await service.updateStatus('enroll-1', EnrollmentStatus.ACCEPTED, 'school-1');

    expect(result.studentUserId).toBe('student-1');
  });

  it('accepts enrollment when applicant email already exists and associates membership', async () => {
    repository.findOne.mockResolvedValue({
      id: 'enroll-1',
      schoolId: 'school-1',
      cycleId: 'cycle-1',
      firstName: 'Ana',
      lastName: 'Perez',
      email: 'ana@example.com',
      phoneNumber: null,
      status: EnrollmentStatus.PENDING,
      studentUserId: null
    } as Enrollment);
    usersService.findByEmail.mockResolvedValue({ id: 'existing-1' } as never);
    usersService.createMembership.mockResolvedValue({ id: 'membership-1' } as never);
    repository.save.mockResolvedValue({
      id: 'enroll-1',
      status: EnrollmentStatus.ACCEPTED,
      studentUserId: 'existing-1'
    } as Enrollment);

    const result = await service.updateStatus('enroll-1', EnrollmentStatus.ACCEPTED, 'school-1');

    expect(result.studentUserId).toBe('existing-1');
  });

  it('generates an expedient', async () => {
    repository.findOne.mockResolvedValue({
      id: 'enroll-1',
      schoolId: 'school-1',
      cycleId: 'cycle-1',
      firstName: 'Ana',
      lastName: 'Perez',
      email: 'ana@example.com',
      phoneNumber: null,
      birthDate: null,
      notes: null,
      status: EnrollmentStatus.PENDING,
      studentUserId: null,
      expedient: {}
    } as Enrollment);
    repository.save.mockResolvedValue({ id: 'enroll-1' } as Enrollment);

    const expedient = await service.generateExpedient('enroll-1', 'school-1');

    expect(expedient).toHaveProperty('student.email', 'ana@example.com');
  });

  it('throws when enrollment is missing', async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(service.findById('missing', 'school-1')).rejects.toThrow(NotFoundException);
  });
});
