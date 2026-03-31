import { SchoolsController } from './schools.controller';

describe('SchoolsController', () => {
  const schoolsService = {
    createSchool: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    updateSchool: jest.fn(),
    deactivateSchool: jest.fn(),
    activateSchool: jest.fn(),
    assignSchoolAdmin: jest.fn(),
    getUsersBySchool: jest.fn(),
    getAdminsBySchool: jest.fn()
  };

  let controller: SchoolsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new SchoolsController(schoolsService as never);
  });

  it('delegates basic school operations', async () => {
    await controller.createSchool({ name: 'Colegio' } as never);
    await controller.findAll({ page: 1 } as never);
    await controller.findById('school-1');
    await controller.updateSchool('school-1', { name: 'Nuevo' } as never);
    await controller.assignSchoolAdmin('school-1', { email: 'admin@colegio.com' } as never, { sub: 'super-1' } as never);
    await controller.getUsersBySchool('school-1');
    await controller.getAdminsBySchool('school-1');

    expect(schoolsService.createSchool).toHaveBeenCalledWith({ name: 'Colegio' });
    expect(schoolsService.findAll).toHaveBeenCalledWith({ page: 1 });
    expect(schoolsService.findById).toHaveBeenCalledWith('school-1');
    expect(schoolsService.updateSchool).toHaveBeenCalledWith('school-1', { name: 'Nuevo' });
    expect(schoolsService.assignSchoolAdmin).toHaveBeenCalledWith(
      'school-1',
      { email: 'admin@colegio.com' },
      'super-1'
    );
    expect(schoolsService.getUsersBySchool).toHaveBeenCalledWith('school-1');
    expect(schoolsService.getAdminsBySchool).toHaveBeenCalledWith('school-1');
  });

  it('returns success messages for activation toggles', async () => {
    const deactivate = await controller.deactivateSchool('school-1');
    const activate = await controller.activateSchool('school-1');

    expect(schoolsService.deactivateSchool).toHaveBeenCalledWith('school-1');
    expect(schoolsService.activateSchool).toHaveBeenCalledWith('school-1');
    expect(deactivate).toEqual({ message: 'Colegio desactivado correctamente' });
    expect(activate).toEqual({ message: 'Colegio activado correctamente' });
  });
});
