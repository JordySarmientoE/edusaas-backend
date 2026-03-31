import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Public } from '../decorators/public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { createMockExecutionContext } from '../test/mock-execution-context.helper';

describe('JwtAuthGuard', () => {
  it('allows public routes', () => {
    class TestController {
      @Public()
      publicRoute() {}
    }

    const guard = new JwtAuthGuard(new Reflector());
    const handler = TestController.prototype.publicRoute;
    const context = createMockExecutionContext({
      request: {},
      handler,
      classRef: TestController
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('returns the authenticated user from handleRequest', () => {
    const guard = new JwtAuthGuard(new Reflector());
    const user = {
      sub: 'user-1',
      email: 'admin@example.com',
      role: 'school_admin',
      schoolId: 'school-1'
    };

    expect(guard.handleRequest(null, user)).toBe(user);
  });

  it('rejects missing authenticated user', () => {
    const guard = new JwtAuthGuard(new Reflector());

    expect(() => guard.handleRequest(null, false)).toThrow(UnauthorizedException);
  });
});
