import { AuthController } from './auth.controller';

describe('AuthController', () => {
  const authService = {
    login: jest.fn(),
    refreshToken: jest.fn(),
    register: jest.fn(),
    completeLoginContext: jest.fn(),
    logout: jest.fn(),
    switchContext: jest.fn()
  };

  let controller: AuthController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuthController(authService as never);
  });

  it('delegates public auth actions', async () => {
    await controller.login({ email: 'a@a.com', password: '123' } as never);
    await controller.refresh({ refreshToken: 'refresh-token' } as never);
    await controller.register({ email: 'a@a.com' } as never);
    await controller.completeLoginContext({ contextToken: 'ctx', membershipId: 'membership-1' } as never);

    expect(authService.login).toHaveBeenCalledWith({ email: 'a@a.com', password: '123' });
    expect(authService.refreshToken).toHaveBeenCalledWith('refresh-token');
    expect(authService.register).toHaveBeenCalledWith({ email: 'a@a.com' });
    expect(authService.completeLoginContext).toHaveBeenCalledWith('ctx', 'membership-1');
  });

  it('returns success message on logout and delegates context switch', async () => {
    const result = await controller.logout({ sub: 'user-1' } as never);
    await controller.switchContext({ sub: 'user-1' } as never, { membershipId: 'membership-2' } as never);

    expect(authService.logout).toHaveBeenCalledWith('user-1');
    expect(authService.switchContext).toHaveBeenCalledWith('user-1', 'membership-2');
    expect(result).toEqual({ message: 'Sesión cerrada correctamente' });
  });
});
