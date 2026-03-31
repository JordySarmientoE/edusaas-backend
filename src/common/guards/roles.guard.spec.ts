import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';
import { createMockExecutionContext } from '../test/mock-execution-context.helper';

describe('RolesGuard', () => {
  it('allows when no roles are required', () => {
    const guard = new RolesGuard(new Reflector());
    const context = createMockExecutionContext({
      request: {
        user: {
          sub: 'user-1',
          email: 'admin@example.com',
          role: Role.SCHOOL_ADMIN,
          schoolId: 'school-1'
        }
      }
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows matching role', () => {
    class TestController {
      @Roles(Role.SCHOOL_ADMIN)
      adminRoute() {}
    }

    const guard = new RolesGuard(new Reflector());
    const context = createMockExecutionContext({
      request: {
        user: {
          sub: 'user-1',
          email: 'admin@example.com',
          role: Role.SCHOOL_ADMIN,
          schoolId: 'school-1'
        }
      },
      handler: TestController.prototype.adminRoute,
      classRef: TestController
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects role mismatch', () => {
    class TestController {
      @Roles(Role.SUPER_ADMIN)
      adminRoute() {}
    }

    const guard = new RolesGuard(new Reflector());
    const context = createMockExecutionContext({
      request: {
        user: {
          sub: 'user-1',
          email: 'teacher@example.com',
          role: Role.TEACHER,
          schoolId: 'school-1'
        }
      },
      handler: TestController.prototype.adminRoute,
      classRef: TestController
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
