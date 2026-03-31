import { ForbiddenException } from '@nestjs/common';
import { Role } from '../common/enums/role.enum';
import { ClassesController } from './classes.controller';

describe('ClassesController', () => {
  const classesService = {
    createClass: jest.fn(),
    findAll: jest.fn(),
    findStudentClasses: jest.fn(),
    findParentClasses: jest.fn(),
    findTeacherClasses: jest.fn(),
    getTeacherSchedule: jest.fn(),
    studentHasClassAccess: jest.fn(),
    getClassSchedules: jest.fn(),
    updateSchedule: jest.fn(),
    deleteSchedule: jest.fn(),
    findById: jest.fn(),
    updateClass: jest.fn(),
    assignTeacher: jest.fn(),
    setSchedule: jest.fn()
  };
  const usersService = {
    getStudentsByClass: jest.fn()
  };

  let controller: ClassesController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ClassesController(classesService as never, usersService as never);
  });

  it('routes my classes by role', async () => {
    await controller.findMyClasses({ role: Role.STUDENT, sub: 'student-1' } as never, { schoolId: 'school-1' });
    await controller.findMyClasses({ role: Role.PARENT, sub: 'parent-1' } as never, { schoolId: 'school-1' });
    await controller.findMyClasses({ role: Role.TEACHER, sub: 'teacher-1' } as never, { schoolId: 'school-1' });

    expect(classesService.findStudentClasses).toHaveBeenCalledWith('student-1', 'school-1');
    expect(classesService.findParentClasses).toHaveBeenCalledWith('parent-1', 'school-1');
    expect(classesService.findTeacherClasses).toHaveBeenCalledWith('teacher-1', 'school-1');
  });

  it('checks student access before returning schedules', async () => {
    classesService.studentHasClassAccess.mockResolvedValue(true);
    await controller.getClassSchedules('class-1', { role: Role.STUDENT, sub: 'student-1' } as never, {
      schoolId: 'school-1'
    });

    expect(classesService.studentHasClassAccess).toHaveBeenCalledWith('class-1', 'student-1', 'school-1');
    expect(classesService.getClassSchedules).toHaveBeenCalledWith('class-1', 'school-1');
  });

  it('rejects schedule access when student is not assigned', async () => {
    classesService.studentHasClassAccess.mockResolvedValue(false);

    await expect(
      controller.getClassSchedules('class-1', { role: Role.STUDENT, sub: 'student-1' } as never, {
        schoolId: 'school-1'
      })
    ).rejects.toThrow(ForbiddenException);
  });

  it('delegates remaining actions', async () => {
    await controller.createClass({} as never, { schoolId: 'school-1' });
    await controller.findAll({ page: 1 } as never, { schoolId: 'school-1' });
    await controller.getTeacherSchedule('teacher-1', { schoolId: 'school-1' });
    await controller.getClassStudents('class-1', { schoolId: 'school-1' });
    await controller.updateSchedule('schedule-1', {} as never, { schoolId: 'school-1' });
    const deleteResult = await controller.deleteSchedule('schedule-1', { schoolId: 'school-1' });
    await controller.findById('class-1', { schoolId: 'school-1' });
    await controller.updateClass('class-1', {} as never, { schoolId: 'school-1' });
    const assignResult = await controller.assignTeacher('class-1', {} as never, { schoolId: 'school-1' });
    await controller.setSchedule('class-1', {} as never, { schoolId: 'school-1' });

    expect(classesService.createClass).toHaveBeenCalledWith({}, 'school-1');
    expect(classesService.findAll).toHaveBeenCalledWith({ page: 1 }, 'school-1');
    expect(classesService.getTeacherSchedule).toHaveBeenCalledWith('teacher-1', 'school-1');
    expect(usersService.getStudentsByClass).toHaveBeenCalledWith('class-1', 'school-1');
    expect(classesService.updateSchedule).toHaveBeenCalledWith('schedule-1', {}, 'school-1');
    expect(classesService.deleteSchedule).toHaveBeenCalledWith('schedule-1', 'school-1');
    expect(classesService.findById).toHaveBeenCalledWith('class-1', 'school-1');
    expect(classesService.updateClass).toHaveBeenCalledWith('class-1', {}, 'school-1');
    expect(classesService.assignTeacher).toHaveBeenCalledWith('class-1', {}, 'school-1');
    expect(classesService.setSchedule).toHaveBeenCalledWith('class-1', {}, 'school-1');
    expect(deleteResult).toEqual({ message: 'Horario eliminado correctamente' });
    expect(assignResult).toEqual({ message: 'Profesor asignado correctamente' });
  });
});
