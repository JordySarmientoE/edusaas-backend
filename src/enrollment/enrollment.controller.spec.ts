import { EnrollmentController } from './enrollment.controller';

describe('EnrollmentController', () => {
  const enrollmentService = {
    createEnrollment: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    updateStatus: jest.fn(),
    generateExpedient: jest.fn(),
    getEnrollmentHistory: jest.fn()
  };

  let controller: EnrollmentController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new EnrollmentController(enrollmentService as never);
  });

  it('delegates CRUD-style actions', async () => {
    await controller.createEnrollment({ cycleId: 'cycle-1' } as never, { schoolId: 'school-1' });
    await controller.findAll({ page: 1 } as never, { schoolId: 'school-1' });
    await controller.findById('enroll-1', { schoolId: 'school-1' });
    await controller.updateStatus('enroll-1', { status: 'accepted' } as never, { schoolId: 'school-1' });
    await controller.generateExpedient('enroll-1', { schoolId: 'school-1' });
    await controller.getEnrollmentHistory('student-1', { schoolId: 'school-1' });

    expect(enrollmentService.createEnrollment).toHaveBeenCalledWith({ cycleId: 'cycle-1' }, 'school-1');
    expect(enrollmentService.findAll).toHaveBeenCalledWith({ page: 1 }, 'school-1');
    expect(enrollmentService.findById).toHaveBeenCalledWith('enroll-1', 'school-1');
    expect(enrollmentService.updateStatus).toHaveBeenCalledWith('enroll-1', 'accepted', 'school-1');
    expect(enrollmentService.generateExpedient).toHaveBeenCalledWith('enroll-1', 'school-1');
    expect(enrollmentService.getEnrollmentHistory).toHaveBeenCalledWith('student-1', 'school-1');
  });
});
