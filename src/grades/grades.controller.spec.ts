import { GradesController } from './grades.controller';

describe('GradesController', () => {
  const gradesService = {
    registerGrade: jest.fn(),
    getClassSummary: jest.fn(),
    getStudentSummaries: jest.fn(),
    getParentSummaries: jest.fn(),
    getOrCreateClassConfig: jest.fn(),
    updateClassConfig: jest.fn(),
    closeClassGrades: jest.fn(),
    reopenClassGrades: jest.fn(),
    closeGradesByPeriod: jest.fn()
  };

  let controller: GradesController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new GradesController(gradesService as never);
  });

  it('delegates read and write actions', async () => {
    await controller.registerGrade({} as never, { schoolId: 'school-1' });
    await controller.getByClass('class-1', { schoolId: 'school-1' });
    await controller.getMyGrades('cycle-1', { sub: 'student-1' } as never, { schoolId: 'school-1' });
    await controller.getChildrenGrades({ sub: 'parent-1' } as never, { schoolId: 'school-1' });
    await controller.getClassConfig('class-1', { schoolId: 'school-1' });
    await controller.updateClassConfig('class-1', { examsWeight: 30 } as never, { schoolId: 'school-1' });

    expect(gradesService.registerGrade).toHaveBeenCalledWith({}, 'school-1');
    expect(gradesService.getClassSummary).toHaveBeenCalledWith('class-1', 'school-1');
    expect(gradesService.getStudentSummaries).toHaveBeenCalledWith('student-1', 'cycle-1', 'school-1');
    expect(gradesService.getParentSummaries).toHaveBeenCalledWith('parent-1', 'school-1');
    expect(gradesService.getOrCreateClassConfig).toHaveBeenCalledWith('class-1', 'school-1');
    expect(gradesService.updateClassConfig).toHaveBeenCalledWith('class-1', { examsWeight: 30 }, 'school-1');
  });

  it('returns success messages for closing and reopening', async () => {
    const closeClass = await controller.closeClass('class-1', { schoolId: 'school-1' });
    const reopenClass = await controller.reopenClass('class-1', { schoolId: 'school-1' });
    const closeCycle = await controller.closeGrades('cycle-1', { schoolId: 'school-1' });

    expect(gradesService.closeClassGrades).toHaveBeenCalledWith('class-1', 'school-1');
    expect(gradesService.reopenClassGrades).toHaveBeenCalledWith('class-1', 'school-1');
    expect(gradesService.closeGradesByPeriod).toHaveBeenCalledWith('cycle-1', 'school-1');
    expect(closeClass).toEqual({ message: 'Curso cerrado correctamente' });
    expect(reopenClass).toEqual({ message: 'Curso reabierto correctamente' });
    expect(closeCycle).toEqual({ message: 'Notas cerradas correctamente' });
  });
});
