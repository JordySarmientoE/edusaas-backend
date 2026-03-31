import { UsersController } from './users.controller';

describe('UsersController', () => {
  const usersService = {
    createUser: jest.fn(),
    associateUserByEmail: jest.fn(),
    findAll: jest.fn(),
    getLinkedStudentsForParent: jest.fn(),
    getOwnProfile: jest.fn(),
    updateOwnProfile: jest.fn(),
    uploadOwnAvatar: jest.fn(),
    removeOwnAvatar: jest.fn(),
    changeOwnPassword: jest.fn(),
    getFamilyLinks: jest.fn(),
    findMembershipDetail: jest.fn(),
    updateMembership: jest.fn(),
    deactivateMembership: jest.fn(),
    activateMembership: jest.fn(),
    linkParentToStudent: jest.fn(),
    assignStudentToClass: jest.fn()
  };

  let controller: UsersController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new UsersController(usersService as never);
  });

  it('delegates user and profile operations', async () => {
    await controller.createUser({ email: 'user@demo.com' } as never, { schoolId: 'school-1' });
    await controller.associateByEmail({ email: 'user@demo.com' } as never, { schoolId: 'school-1' }, { sub: 'admin-1' } as never);
    await controller.findAll({ page: 1 } as never, { schoolId: 'school-1' });
    await controller.findLinkedStudents({ sub: 'parent-1' } as never, { schoolId: 'school-1' });
    await controller.getOwnProfile({ sub: 'user-1' } as never);
    await controller.updateOwnProfile({ sub: 'user-1' } as never, { firstName: 'Ana' } as never);
    await controller.uploadOwnAvatar({ sub: 'user-1' } as never, { originalname: 'a.png', buffer: Buffer.from('a') });
    await controller.removeOwnAvatar({ sub: 'user-1' } as never);
    await controller.getMyFamilyLinks({ sub: 'user-1', role: 'parent' } as never, { schoolId: 'school-1' });
    await controller.findById('membership-1', { schoolId: 'school-1' });
    await controller.updateUser('membership-1', { role: 'teacher' } as never, { schoolId: 'school-1' });

    expect(usersService.createUser).toHaveBeenCalledWith({ email: 'user@demo.com' }, 'school-1');
    expect(usersService.associateUserByEmail).toHaveBeenCalledWith({ email: 'user@demo.com' }, 'school-1', 'admin-1');
    expect(usersService.findAll).toHaveBeenCalledWith({ page: 1 }, 'school-1');
    expect(usersService.getLinkedStudentsForParent).toHaveBeenCalledWith('parent-1', 'school-1');
    expect(usersService.getOwnProfile).toHaveBeenCalledWith('user-1');
    expect(usersService.updateOwnProfile).toHaveBeenCalledWith('user-1', { firstName: 'Ana' });
    expect(usersService.uploadOwnAvatar).toHaveBeenCalledWith('user-1', expect.any(Object));
    expect(usersService.removeOwnAvatar).toHaveBeenCalledWith('user-1');
    expect(usersService.getFamilyLinks).toHaveBeenCalledWith('user-1', 'school-1', 'parent');
    expect(usersService.findMembershipDetail).toHaveBeenCalledWith('membership-1', 'school-1');
    expect(usersService.updateMembership).toHaveBeenCalledWith('membership-1', { role: 'teacher' }, 'school-1');
  });

  it('returns success messages for mutations with side effects', async () => {
    const password = await controller.changeOwnPassword({ sub: 'user-1' } as never, { currentPassword: 'a', newPassword: 'b' } as never);
    const deactivate = await controller.deactivateUser('membership-1', { schoolId: 'school-1' });
    const activate = await controller.activateUser('membership-1', { schoolId: 'school-1' });
    const link = await controller.linkParentToStudent('parent-1', 'student-1', { schoolId: 'school-1' });
    const assign = await controller.assignStudentToClass('student-1', 'class-1', { schoolId: 'school-1' });

    expect(usersService.changeOwnPassword).toHaveBeenCalledWith('user-1', expect.any(Object));
    expect(usersService.deactivateMembership).toHaveBeenCalledWith('membership-1', 'school-1');
    expect(usersService.activateMembership).toHaveBeenCalledWith('membership-1', 'school-1');
    expect(usersService.linkParentToStudent).toHaveBeenCalledWith('parent-1', 'student-1', 'school-1');
    expect(usersService.assignStudentToClass).toHaveBeenCalledWith('student-1', 'class-1', 'school-1');
    expect(password).toEqual({ message: 'Contraseña actualizada correctamente. Inicia sesión de nuevo.' });
    expect(deactivate).toEqual({ message: 'Membresía desactivada correctamente' });
    expect(activate).toEqual({ message: 'Membresía activada correctamente' });
    expect(link).toEqual({ message: 'Padre vinculado al alumno correctamente' });
    expect(assign).toEqual({ message: 'Alumno asignado a la clase correctamente' });
  });
});
