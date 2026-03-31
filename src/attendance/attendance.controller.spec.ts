import { AttendanceController } from './attendance.controller';

describe('AttendanceController', () => {
  const attendanceService = {
    takeAttendance: jest.fn(),
    getByClass: jest.fn(),
    getByStudent: jest.fn(),
    getByParent: jest.fn()
  };

  let controller: AttendanceController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AttendanceController(attendanceService as never);
  });

  it('delegates teacher and admin attendance queries', async () => {
    await controller.takeAttendance({ classId: 'class-1' } as never, { schoolId: 'school-1' });
    await controller.getByClass('class-1', { from: '2026-01-01' } as never, { schoolId: 'school-1' });
    await controller.getByStudent('student-1', { schoolId: 'school-1' });

    expect(attendanceService.takeAttendance).toHaveBeenCalledWith({ classId: 'class-1' }, 'school-1');
    expect(attendanceService.getByClass).toHaveBeenCalledWith('class-1', { from: '2026-01-01' }, 'school-1');
    expect(attendanceService.getByStudent).toHaveBeenCalledWith('student-1', 'school-1');
  });

  it('delegates student and parent self-service queries', async () => {
    await controller.getMyAttendance({ sub: 'student-1' } as never, { schoolId: 'school-1' });
    await controller.getChildrenAttendance({ sub: 'parent-1' } as never, { schoolId: 'school-1' });

    expect(attendanceService.getByStudent).toHaveBeenCalledWith('student-1', 'school-1');
    expect(attendanceService.getByParent).toHaveBeenCalledWith('parent-1', 'school-1');
  });
});
