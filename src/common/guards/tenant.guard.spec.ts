import { ForbiddenException } from '@nestjs/common';
import { Role } from '../enums/role.enum';
import { TenantGuard } from './tenant.guard';
import { createMockExecutionContext } from '../test/mock-execution-context.helper';

describe('TenantGuard', () => {
  it('copies schoolId from the authenticated user', () => {
    const request: Record<string, unknown> = {
      user: {
        sub: 'user-1',
        email: 'admin@example.com',
        role: Role.SCHOOL_ADMIN,
        schoolId: 'school-1'
      }
    };
    const guard = new TenantGuard();
    const context = createMockExecutionContext({ request });

    expect(guard.canActivate(context)).toBe(true);
    expect(request.schoolId).toBe('school-1');
  });

  it('allows super admin and reads schoolId from route params', () => {
    const request: Record<string, unknown> = {
      user: {
        sub: 'user-1',
        email: 'super@example.com',
        role: Role.SUPER_ADMIN,
        schoolId: null
      },
      params: {
        schoolId: 'school-2'
      }
    };
    const guard = new TenantGuard();
    const context = createMockExecutionContext({ request });

    expect(guard.canActivate(context)).toBe(true);
    expect(request.schoolId).toBe('school-2');
  });

  it('rejects tenant users without schoolId', () => {
    const guard = new TenantGuard();
    const context = createMockExecutionContext({
      request: {
        user: {
          sub: 'user-1',
          email: 'teacher@example.com',
          role: Role.TEACHER,
          schoolId: null
        }
      }
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
