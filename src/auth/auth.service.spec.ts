import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../common/enums/role.enum';
import { UsersService } from '../users/users.service';
import { SchoolMembershipStatus } from '../users/entities/school-membership.entity';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            listMemberships: jest.fn(),
            getMembershipByIdForUser: jest.fn(),
            validatePassword: jest.fn(),
            updateRefreshToken: jest.fn(),
            validateRefreshToken: jest.fn(),
            createGlobalUser: jest.fn()
          }
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn()
          }
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const values: Record<string, string> = {
                JWT_SECRET: 'change_me_with_at_least_32_characters',
                JWT_REFRESH_SECRET: 'change_me_with_at_least_32_characters_too',
                JWT_CONTEXT_SECRET: 'change_me_with_at_least_32_characters_three',
                JWT_EXPIRES_IN: '15m',
                JWT_REFRESH_EXPIRES_IN: '7d',
                JWT_CONTEXT_EXPIRES_IN: '5m'
              };
              return values[key];
            })
          }
        }
      ]
    }).compile();

    service = moduleRef.get(AuthService);
    usersService = moduleRef.get(UsersService);
    jwtService = moduleRef.get(JwtService);
  });

  it('logs in a super admin and rotates refresh token', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'admin@example.com',
      role: Role.SUPER_ADMIN,
      schoolId: null,
      isActive: true
    } as never);
    usersService.validatePassword.mockResolvedValue(true);
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const result = await service.login({
      email: 'admin@example.com',
      password: 'Admin123456!'
    });

    expect('accessToken' in result ? result.accessToken : undefined).toBe('access-token');
    expect('refreshToken' in result ? result.refreshToken : undefined).toBe('refresh-token');
    expect(usersService.updateRefreshToken).toHaveBeenCalledWith('user-1', 'refresh-token');
  });

  it('returns context selection data for a regular user login', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'user-2',
      email: 'teacher@example.com',
      role: Role.PLATFORM_USER,
      schoolId: null,
      isActive: true
    } as never);
    usersService.validatePassword.mockResolvedValue(true);
    usersService.listMemberships.mockResolvedValue([
      {
        id: 'membership-1',
        schoolId: 'school-1',
        role: Role.TEACHER,
        status: SchoolMembershipStatus.ACTIVE,
        school: { name: 'Colegio Uno', slug: 'colegio-uno' }
      }
    ] as never);
    jwtService.signAsync.mockResolvedValueOnce('context-token');

    const result = await service.login({
      email: 'teacher@example.com',
      password: 'Teacher123!'
    });

    expect(result.contextToken).toBe('context-token');
    expect(result.requiresMembershipSelection).toBe(true);
    expect('accessToken' in result ? result.accessToken : undefined).toBeUndefined();
    expect(usersService.updateRefreshToken).not.toHaveBeenCalled();
  });

  it('rejects invalid credentials', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'missing@example.com',
        password: 'Admin123456!'
      })
    ).rejects.toThrow(UnauthorizedException);
  });

  it('refreshes tokens when refresh token is valid', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      email: 'admin@example.com',
      role: Role.SUPER_ADMIN,
      schoolId: null,
      membershipId: null,
      tokenType: 'refresh'
    });
    usersService.validateRefreshToken.mockResolvedValue({
      id: 'user-1',
      email: 'admin@example.com',
      role: Role.SUPER_ADMIN,
      schoolId: null
    } as never);
    jwtService.signAsync.mockResolvedValueOnce('new-access').mockResolvedValueOnce('new-refresh');

    const result = await service.refreshToken('refresh-token');

    expect(result).toEqual({
      accessToken: 'new-access',
      refreshToken: 'new-refresh'
    });
  });

  it('completes login context and issues session tokens for the chosen membership', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-2',
      email: 'teacher@example.com',
      tokenType: 'context'
    });
    usersService.findById.mockResolvedValue({
      id: 'user-2',
      email: 'teacher@example.com',
      role: Role.PLATFORM_USER,
      schoolId: null
    } as never);
    usersService.getMembershipByIdForUser.mockResolvedValue({
      id: 'membership-1',
      userId: 'user-2',
      schoolId: 'school-1',
      role: Role.TEACHER,
      status: SchoolMembershipStatus.ACTIVE,
      school: { name: 'Colegio Uno', slug: 'colegio-uno' }
    } as never);
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token')
      .mockResolvedValueOnce('next-context-token');

    const result = await service.completeLoginContext('context-token', 'membership-1');

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.contextToken).toBe('next-context-token');
    expect(result.activeMembershipId).toBe('membership-1');
    expect(usersService.updateRefreshToken).toHaveBeenCalledWith('user-2', 'refresh-token');
  });
});
