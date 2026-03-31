import { TasksController } from './tasks.controller';

describe('TasksController', () => {
  const tasksService = {
    createTask: jest.fn(),
    findByClass: jest.fn(),
    getTaskGradebook: jest.fn(),
    gradeTask: jest.fn(),
    findByStudent: jest.fn(),
    getMySubmission: jest.fn(),
    submitTask: jest.fn(),
    findByParent: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn()
  };

  let controller: TasksController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new TasksController(tasksService as never);
  });

  it('normalizes create payload before delegating', async () => {
    const dto = {
      classId: 'class-1',
      title: 'Tarea',
      description: 'Desc',
      taskType: 'homework',
      submissionMode: 'student_submission',
      affectsGrade: 'true',
      maxScore: '20',
      dueDate: '2026-03-30'
    } as never;

    await controller.createTask(dto, { schoolId: 'school-1' }, { sub: 'teacher-1' } as never);

    expect(tasksService.createTask).toHaveBeenCalledWith(
      expect.objectContaining({ affectsGrade: true, maxScore: 20 }),
      'school-1',
      'teacher-1',
      []
    );
  });

  it('normalizes update payload branches', async () => {
    await controller.updateTask(
      'task-1',
      { affectsGrade: 'false', maxScore: '' } as never,
      { schoolId: 'school-1' }
    );

    expect(tasksService.updateTask).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({ affectsGrade: false, maxScore: null }),
      'school-1',
      []
    );
  });

  it('delegates listing and student actions', async () => {
    const filters = { page: 1 } as never;
    const gradeDto = { grades: [] } as never;
    const submitDto = { content: 'entrega' } as never;

    await controller.findByClass('class-1', filters, { schoolId: 'school-1' });
    await controller.getGradebook('task-1', { schoolId: 'school-1' });
    await controller.saveGradebook('task-1', gradeDto, { schoolId: 'school-1' });
    await controller.getMyTasks({ sub: 'student-1' } as never, { schoolId: 'school-1' });
    await controller.getMySubmission('task-1', { sub: 'student-1' } as never, { schoolId: 'school-1' });
    await controller.submitTask('task-1', submitDto, { sub: 'student-1' } as never, { schoolId: 'school-1' });
    await controller.getChildrenTasks({ sub: 'parent-1' } as never, { schoolId: 'school-1' });

    expect(tasksService.findByClass).toHaveBeenCalledWith('class-1', 'school-1', filters);
    expect(tasksService.getTaskGradebook).toHaveBeenCalledWith('task-1', 'school-1');
    expect(tasksService.gradeTask).toHaveBeenCalledWith('task-1', gradeDto, 'school-1');
    expect(tasksService.findByStudent).toHaveBeenCalledWith('student-1', 'school-1');
    expect(tasksService.getMySubmission).toHaveBeenCalledWith('task-1', 'student-1', 'school-1');
    expect(tasksService.submitTask).toHaveBeenCalledWith('task-1', submitDto, 'student-1', 'school-1');
    expect(tasksService.findByParent).toHaveBeenCalledWith('parent-1', 'school-1');
  });

  it('returns success message when deleting task', async () => {
    const result = await controller.deleteTask('task-1', { schoolId: 'school-1' });

    expect(tasksService.deleteTask).toHaveBeenCalledWith('task-1', 'school-1');
    expect(result).toEqual({ message: 'Tarea eliminada correctamente' });
  });
});
