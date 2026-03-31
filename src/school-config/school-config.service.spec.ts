import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { StorageService } from '../common/services/storage.service';
import { SchoolsService } from '../schools/schools.service';
import { GradeScale, SchoolConfig } from './entities/school-config.entity';
import { SchoolConfigService } from './school-config.service';
import { SchoolConfigsRepository } from './repositories';

describe('SchoolConfigService', () => {
  let service: SchoolConfigService;
  let repository: jest.Mocked<Repository<SchoolConfig>>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        SchoolConfigService,
        {
          provide: SchoolConfigsRepository,
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn()
          }
        },
        {
          provide: SchoolsService,
          useValue: {
            findById: jest.fn().mockResolvedValue({ id: 'school-1' })
          }
        },
        {
          provide: StorageService,
          useValue: {
            storeSchoolLogo: jest.fn().mockResolvedValue('/uploads/logos/logo.png')
          }
        }
      ]
    }).compile();

    service = moduleRef.get(SchoolConfigService);
    repository = moduleRef.get(SchoolConfigsRepository);
  });

  it('creates a default config when one does not exist', async () => {
    repository.findOne.mockResolvedValue(null);
    repository.create.mockReturnValue({
      schoolId: 'school-1',
      gradingScale: GradeScale.NUMERIC_20
    } as SchoolConfig);
    repository.save.mockResolvedValue({
      schoolId: 'school-1',
      gradingScale: GradeScale.NUMERIC_20
    } as SchoolConfig);

    const result = await service.getConfig('school-1');

    expect(result.schoolId).toBe('school-1');
  });

  it('updates config fields', async () => {
    repository.findOne.mockResolvedValue({
      schoolId: 'school-1',
      primaryColor: '28 126 214'
    } as SchoolConfig);
    repository.save.mockResolvedValue({
      schoolId: 'school-1',
      primaryColor: '10 10 10'
    } as SchoolConfig);

    const result = await service.updateConfig('school-1', {
      primaryColor: '10 10 10'
    });

    expect(result.primaryColor).toBe('10 10 10');
  });

  it('rejects missing files on logo upload', async () => {
    await expect(service.uploadLogo('school-1')).rejects.toThrow(NotFoundException);
  });
});
