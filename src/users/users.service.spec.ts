import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { ClassesService } from '../classes/classes.service';
import { Role } from '../common/enums/role.enum';
import { StorageService } from '../common/services/storage.service';
import { ParentStudentLink } from './entities/parent-student-link.entity';
import { SchoolInvitation } from './entities/school-invitation.entity';
import { SchoolMembership, SchoolMembershipStatus } from './entities/school-membership.entity';
import { StudentClassAssignment } from './entities/student-class-assignment.entity';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import {
  ParentStudentLinksRepository,
  SchoolInvitationsRepository,
  SchoolMembershipsRepository,
  StudentClassAssignmentsRepository,
  UsersRepository
} from './repositories';

jest.mock('bcrypt', () => ({
  hash: jest.fn(async (value: string) => `hashed-${value}`),
  compare: jest.fn(async (value: string, hash: string) => hash === `hashed-${value}`)
}));

type FindOneOptionsLike = {
  where?: {
    id?: string;
    userId?: string;
  };
};

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: jest.Mocked<Repository<User>>;
  let parentLinksRepository: jest.Mocked<Repository<ParentStudentLink>>;
  let studentClassRepository: jest.Mocked<Repository<StudentClassAssignment>>;
  let schoolMembershipsRepository: jest.Mocked<Repository<SchoolMembership>>;
  let schoolInvitationsRepository: jest.Mocked<Repository<SchoolInvitation>>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn()
          }
        },
        {
          provide: ParentStudentLinksRepository,
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn()
          }
        },
        {
          provide: StudentClassAssignmentsRepository,
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn()
          }
        },
        {
          provide: SchoolMembershipsRepository,
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn()
          }
        },
        {
          provide: SchoolInvitationsRepository,
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn()
          }
        },
        {
          provide: ClassesService,
          useValue: {
            findById: jest.fn()
          }
        },
        {
          provide: StorageService,
          useValue: {
            uploadFile: jest.fn(),
            deleteFile: jest.fn(),
            resolveUrl: jest.fn((value: string) => value)
          }
        }
      ]
    }).compile();

    service = moduleRef.get(UsersService);
    usersRepository = moduleRef.get(UsersRepository);
    parentLinksRepository = moduleRef.get(ParentStudentLinksRepository);
    studentClassRepository = moduleRef.get(StudentClassAssignmentsRepository);
    schoolMembershipsRepository = moduleRef.get(SchoolMembershipsRepository);
    schoolInvitationsRepository = moduleRef.get(SchoolInvitationsRepository);
  });

  it('creates a user inside the school', async () => {
    usersRepository.findOne.mockResolvedValue(null);
    schoolInvitationsRepository.find.mockResolvedValue([]);
    schoolMembershipsRepository.findOne.mockResolvedValue(null);
    schoolMembershipsRepository.create.mockReturnValue({ userId: 'user-1', schoolId: 'school-1' } as SchoolMembership);
    schoolMembershipsRepository.save.mockResolvedValue({ id: 'membership-1' } as SchoolMembership);
    usersRepository.create.mockReturnValue({ email: 'teacher@example.com' } as User);
    usersRepository.save.mockResolvedValue({ id: 'user-1', email: 'teacher@example.com' } as User);

    const result = await service.createUser(
      {
        firstName: 'Ana',
        lastName: 'Perez',
        email: 'teacher@example.com',
        password: 'Password123',
        role: Role.TEACHER
      },
      'school-1'
    );

    expect(result.id).toBe('user-1');
  });

  it('returns paginated users', async () => {
    const queryBuilder = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([
        [
          {
            id: 'membership-1',
            userId: 'user-1',
            schoolId: 'school-1',
            role: Role.TEACHER,
            status: 'active',
            user: {
              id: 'user-1',
              firstName: 'Ana',
              lastName: 'Perez',
              phoneNumber: null,
              email: 'teacher@example.com',
              isActive: true
            }
          }
        ],
        1
      ])
    };
    schoolMembershipsRepository.createQueryBuilder.mockReturnValue(queryBuilder as never);

    const result = await service.findAll({ page: 1, limit: 10 }, 'school-1');

    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.data[0].membershipId).toBe('membership-1');
  });

  it('links parent to student', async () => {
    usersRepository.findOne.mockImplementation(async (options?: FindOneOptionsLike) => {
      const where = options?.where ?? {};
      if (where.id === 'parent-1') {
        return { id: 'parent-1', role: Role.PLATFORM_USER, schoolId: null } as User;
      }
      if (where.id === 'student-1') {
        return { id: 'student-1', role: Role.PLATFORM_USER, schoolId: null } as User;
      }
      return null;
    });
    schoolMembershipsRepository.findOne.mockImplementation(async (options?: FindOneOptionsLike) => {
      const where = options?.where ?? {};
      if (where.userId === 'parent-1') {
        return { userId: 'parent-1', schoolId: 'school-1', role: Role.TEACHER } as SchoolMembership;
      }
      if (where.userId === 'student-1') {
        return { userId: 'student-1', schoolId: 'school-1', role: Role.STUDENT } as SchoolMembership;
      }
      return null;
    });
    schoolMembershipsRepository.find.mockImplementation(async (options?: FindOneOptionsLike) => {
      const where = options?.where ?? {};
      if (where.userId === 'parent-1') {
        return [{ userId: 'parent-1', schoolId: 'school-1', role: Role.TEACHER }] as never;
      }
      if (where.userId === 'student-1') {
        return [{ userId: 'student-1', schoolId: 'school-1', role: Role.STUDENT }] as never;
      }
      return [] as never;
    });
    parentLinksRepository.findOne.mockResolvedValue(null);
    parentLinksRepository.create.mockReturnValue({ parentId: 'parent-1', studentId: 'student-1' } as ParentStudentLink);

    await service.linkParentToStudent('parent-1', 'student-1', 'school-1');

    expect(parentLinksRepository.save).toHaveBeenCalled();
  });

  it('rejects linking users without a guardian-capable membership', async () => {
    usersRepository.findOne.mockImplementation(async (options?: FindOneOptionsLike) => {
      const where = options?.where ?? {};
      if (where.id === 'user-1') {
        return { id: 'user-1', role: Role.PLATFORM_USER, schoolId: null } as User;
      }
      if (where.id === 'student-1') {
        return { id: 'student-1', role: Role.PLATFORM_USER, schoolId: null } as User;
      }
      return null;
    });
    schoolMembershipsRepository.findOne.mockImplementation(async (options?: FindOneOptionsLike) => {
      const where = options?.where ?? {};
      if (where.userId === 'user-1') {
        return { userId: 'user-1', schoolId: 'school-1', role: Role.STUDENT } as SchoolMembership;
      }
      if (where.userId === 'student-1') {
        return { userId: 'student-1', schoolId: 'school-1', role: Role.STUDENT } as SchoolMembership;
      }
      return null;
    });
    schoolMembershipsRepository.find.mockImplementation(async (options?: FindOneOptionsLike) => {
      const where = options?.where ?? {};
      if (where.userId === 'user-1') {
        return [{ userId: 'user-1', schoolId: 'school-1', role: Role.STUDENT }] as never;
      }
      if (where.userId === 'student-1') {
        return [{ userId: 'student-1', schoolId: 'school-1', role: Role.STUDENT }] as never;
      }
      return [] as never;
    });

    await expect(service.linkParentToStudent('user-1', 'student-1', 'school-1')).rejects.toThrow(
      ConflictException
    );
  });

  it('throws when user is missing', async () => {
    usersRepository.findOne.mockResolvedValue(null);
    await expect(service.findById('missing', 'school-1')).rejects.toThrow(NotFoundException);
  });

  it('updates an existing membership when status changes', async () => {
    const existing = {
      id: 'membership-1',
      userId: 'user-1',
      schoolId: 'school-1',
      role: Role.TEACHER,
      status: SchoolMembershipStatus.PENDING,
      invitedByUserId: null,
      joinedAt: null
    } as SchoolMembership;
    schoolMembershipsRepository.findOne.mockResolvedValue(existing);
    schoolMembershipsRepository.save.mockImplementation(async (value) => value as never);

    const result = await service.createMembership({
      userId: 'user-1',
      schoolId: 'school-1',
      role: Role.TEACHER,
      status: SchoolMembershipStatus.ACTIVE,
      invitedByUserId: 'admin-1'
    });

    expect(result.status).toBe(SchoolMembershipStatus.ACTIVE);
    expect(result.invitedByUserId).toBe('admin-1');
    expect(result.joinedAt).toBeInstanceOf(Date);
  });

  it('creates a legacy membership when the user still belongs to the school', async () => {
    schoolMembershipsRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'membership-legacy',
        userId: 'user-1',
        schoolId: 'school-1',
        role: Role.TEACHER,
        status: SchoolMembershipStatus.ACTIVE
      } as SchoolMembership);
    usersRepository.findOne.mockResolvedValue({
      id: 'user-1',
      schoolId: 'school-1',
      role: Role.TEACHER
    } as User);
    schoolMembershipsRepository.create.mockImplementation((value) => value as never);
    schoolMembershipsRepository.save.mockImplementation(async (value) => value as never);

    const result = await service.getMembershipForUserInSchool('user-1', 'school-1');

    expect(schoolMembershipsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        schoolId: 'school-1',
        role: Role.TEACHER,
        status: SchoolMembershipStatus.ACTIVE
      })
    );
    expect(result.id).toBe('membership-legacy');
  });

  it('rejects when the user does not have one of the expected roles', async () => {
    usersRepository.findOne.mockResolvedValue({ id: 'user-1', role: Role.PLATFORM_USER } as User);
    schoolMembershipsRepository.find.mockResolvedValue([
      { userId: 'user-1', schoolId: 'school-1', role: Role.STUDENT, status: SchoolMembershipStatus.ACTIVE }
    ] as never);

    await expect(service.ensureUserHasRoleInSchool('user-1', 'school-1', [Role.TEACHER])).rejects.toThrow(
      ConflictException
    );
  });

  it('associates an existing user by creating a membership', async () => {
    usersRepository.findOne.mockResolvedValue({ id: 'user-1', email: 'teacher@example.com' } as User);
    schoolMembershipsRepository.findOne.mockResolvedValue(null);
    schoolMembershipsRepository.create.mockImplementation((value) => value as never);
    schoolMembershipsRepository.save.mockImplementation(async (value) => ({ id: 'membership-1', ...value }) as never);

    const result = await service.associateUserByEmail(
      { email: 'teacher@example.com', role: Role.TEACHER },
      'school-1',
      'admin-1'
    );

    expect(result.type).toBe('membership');
    expect(result.membership).toEqual(
      expect.objectContaining({
        id: 'membership-1',
        userId: 'user-1',
        schoolId: 'school-1',
        role: Role.TEACHER
      })
    );
  });

  it('reuses an existing invitation for the same email and role', async () => {
    usersRepository.findOne.mockResolvedValue(null);
    schoolInvitationsRepository.findOne.mockResolvedValue({
      id: 'invite-1',
      schoolId: 'school-1',
      email: 'parent@example.com',
      role: Role.PARENT,
      status: 'accepted',
      invitedByUserId: null
    } as never);
    schoolInvitationsRepository.save.mockImplementation(async (value) => value as never);

    const result = await service.associateUserByEmail(
      { email: 'parent@example.com', role: Role.PARENT },
      'school-1',
      'admin-1'
    );

    expect(result.type).toBe('invitation');
    expect(result.invitation).toEqual(
      expect.objectContaining({
        id: 'invite-1',
        status: 'pending',
        invitedByUserId: 'admin-1'
      })
    );
  });

  it('updates membership data including credentials', async () => {
    const membership = {
      id: 'membership-1',
      userId: 'user-1',
      schoolId: 'school-1',
      role: Role.STUDENT,
      status: SchoolMembershipStatus.ACTIVE,
      user: {
        id: 'user-1',
        firstName: 'Ana',
        lastName: 'Perez',
        phoneNumber: null,
        email: 'ana@example.com',
        isActive: true,
        role: Role.PLATFORM_USER
      }
    } as unknown as SchoolMembership;
    schoolMembershipsRepository.findOne.mockResolvedValue(membership);
    usersRepository.findOne.mockResolvedValue(null);
    usersRepository.save.mockImplementation(async (value) => value as never);
    schoolMembershipsRepository.save.mockImplementation(async (value) => value as never);

    const result = await service.updateMembership(
      'membership-1',
      {
        firstName: 'Ana Maria',
        lastName: 'Rojas',
        email: 'ana.rojas@example.com',
        password: 'Nueva123!',
        role: Role.TEACHER,
        isActive: false,
        phoneNumber: '987654321'
      },
      'school-1'
    );

    expect(result.firstName).toBe('Ana Maria');
    expect(result.role).toBe(Role.TEACHER);
    expect(usersRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ana.rojas@example.com',
        firstName: 'Ana Maria',
        lastName: 'Rojas',
        isActive: false,
        phoneNumber: '987654321',
        passwordHash: 'hashed-Nueva123!'
      })
    );
  });

  it('maps linked students with unique class ids', async () => {
    usersRepository.findOne.mockImplementation(async (options?: FindOneOptionsLike) => {
      const where = options?.where ?? {};
      if (where.id === 'parent-1') {
        return { id: 'parent-1', schoolId: 'school-1', role: Role.PLATFORM_USER } as User;
      }
      return null;
    });
    schoolMembershipsRepository.findOne.mockResolvedValue({
      userId: 'parent-1',
      schoolId: 'school-1',
      role: Role.PARENT,
      status: SchoolMembershipStatus.ACTIVE
    } as never);
    schoolMembershipsRepository.find.mockResolvedValue([
      { userId: 'parent-1', schoolId: 'school-1', role: Role.PARENT, status: SchoolMembershipStatus.ACTIVE }
    ] as never);
    parentLinksRepository.find.mockResolvedValue([
      { studentId: 'student-1' },
      { studentId: 'student-2' }
    ] as never);
    usersRepository.find.mockResolvedValue([
      { id: 'student-1', firstName: 'Ana', lastName: 'Perez', email: 'ana@example.com' },
      { id: 'student-2', firstName: 'Luis', lastName: 'Diaz', email: 'luis@example.com' }
    ] as never);
    studentClassRepository.find.mockResolvedValue([
      { studentId: 'student-1', classId: 'class-1' },
      { studentId: 'student-1', classId: 'class-1' },
      { studentId: 'student-1', classId: 'class-2' }
    ] as never);

    const result = await service.getLinkedStudentsForParent('parent-1', 'school-1');

    expect(result).toEqual([
      {
        id: 'student-1',
        firstName: 'Ana',
        lastName: 'Perez',
        email: 'ana@example.com',
        classIds: ['class-1', 'class-2']
      },
      {
        id: 'student-2',
        firstName: 'Luis',
        lastName: 'Diaz',
        email: 'luis@example.com',
        classIds: []
      }
    ]);
  });

  it('trims own profile fields when updating them', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: 'user-1',
      firstName: 'Ana',
      lastName: 'Perez',
      phoneNumber: '999999999',
      email: 'ana@example.com',
      avatarUrl: null
    } as User);
    usersRepository.save.mockImplementation(async (value) => value as never);

    const result = await service.updateOwnProfile('user-1', {
      firstName: ' Ana Maria ',
      lastName: ' Rojas ',
      phoneNumber: '   '
    });

    expect(result).toEqual(
      expect.objectContaining({
        firstName: 'Ana Maria',
        lastName: 'Rojas',
        phoneNumber: null
      })
    );
  });
});
