import { NotificationsController } from './notifications.controller';

describe('NotificationsController', () => {
  const notificationsService = {
    getByUser: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn()
  };

  let controller: NotificationsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new NotificationsController(notificationsService as never);
  });

  it('delegates listing notifications', async () => {
    await controller.getMyNotifications({ sub: 'user-1' } as never, { schoolId: 'school-1' });
    expect(notificationsService.getByUser).toHaveBeenCalledWith('user-1', 'school-1');
  });

  it('returns success messages for read actions', async () => {
    const one = await controller.markAsRead('notification-1', { sub: 'user-1' } as never);
    const all = await controller.markAllAsRead({ sub: 'user-1' } as never);

    expect(notificationsService.markAsRead).toHaveBeenCalledWith('notification-1', 'user-1');
    expect(notificationsService.markAllAsRead).toHaveBeenCalledWith('user-1');
    expect(one).toEqual({ message: 'Notificación marcada como leída' });
    expect(all).toEqual({ message: 'Notificaciones marcadas como leídas' });
  });
});
