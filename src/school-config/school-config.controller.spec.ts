import { SchoolConfigController } from './school-config.controller';

describe('SchoolConfigController', () => {
  const schoolConfigService = {
    getConfig: jest.fn(),
    updateConfig: jest.fn(),
    uploadLogo: jest.fn()
  };

  let controller: SchoolConfigController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new SchoolConfigController(schoolConfigService as never);
  });

  it('delegates config reads and updates', async () => {
    await controller.getConfig({ schoolId: 'school-1' });
    await controller.updateConfig({ schoolId: 'school-1' }, { schoolName: 'Demo' } as never);
    await controller.getConfigBySchool('school-2');
    await controller.updateConfigBySchool('school-2', { schoolName: 'Demo 2' } as never);

    expect(schoolConfigService.getConfig).toHaveBeenCalledWith('school-1');
    expect(schoolConfigService.updateConfig).toHaveBeenCalledWith('school-1', { schoolName: 'Demo' });
    expect(schoolConfigService.getConfig).toHaveBeenCalledWith('school-2');
    expect(schoolConfigService.updateConfig).toHaveBeenCalledWith('school-2', { schoolName: 'Demo 2' });
  });

  it('maps upload logo responses', async () => {
    schoolConfigService.uploadLogo.mockResolvedValue('/logos/logo.png');

    const own = await controller.uploadLogo({ schoolId: 'school-1' }, { originalname: 'logo.png', buffer: Buffer.from('x') });
    const bySchool = await controller.uploadLogoBySchool('school-2', { originalname: 'logo2.png', buffer: Buffer.from('y') });

    expect(schoolConfigService.uploadLogo).toHaveBeenCalledWith('school-1', expect.any(Object));
    expect(schoolConfigService.uploadLogo).toHaveBeenCalledWith('school-2', expect.any(Object));
    expect(own).toEqual({ logoUrl: '/logos/logo.png' });
    expect(bySchool).toEqual({ logoUrl: '/logos/logo.png' });
  });
});
