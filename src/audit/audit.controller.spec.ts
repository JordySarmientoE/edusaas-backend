import { AuditController } from './audit.controller';

describe('AuditController', () => {
  const auditService = {
    getHistory: jest.fn()
  };

  let controller: AuditController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuditController(auditService as never);
  });

  it('delegates audit history lookup with nullable school id', async () => {
    await controller.getHistory({ page: 1 } as never, { schoolId: 'school-1' });
    await controller.getHistory({ page: 2 } as never, {});

    expect(auditService.getHistory).toHaveBeenNthCalledWith(1, { page: 1 }, 'school-1');
    expect(auditService.getHistory).toHaveBeenNthCalledWith(2, { page: 2 }, null);
  });
});
