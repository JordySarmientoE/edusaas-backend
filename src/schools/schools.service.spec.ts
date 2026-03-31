import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { School } from './entities/school.entity';
import { SchoolsService } from './schools.service';
import { SchoolsRepository } from './repositories';

describe('SchoolsService', () => {
  let service: SchoolsService;
  let repository: jest.Mocked<Repository<School>>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        SchoolsService,
        {
          provide: SchoolsRepository,
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn()
          }
        },
        {
          provide: UsersService,
          useValue: {
            findBySchoolId: jest.fn()
          }
        }
      ]
    }).compile();

    service = moduleRef.get(SchoolsService);
    repository = moduleRef.get(SchoolsRepository);
  });

  it('creates a school when name and slug are available', async () => {
    repository.findOne.mockResolvedValue(null);
    repository.create.mockReturnValue({ name: 'Colegio Uno' } as School);
    repository.save.mockResolvedValue({ id: 'school-1', name: 'Colegio Uno' } as School);

    const result = await service.createSchool({
      name: 'Colegio Uno',
      slug: 'colegio-uno'
    });

    expect(result.id).toBe('school-1');
  });

  it('rejects duplicate schools', async () => {
    repository.findOne.mockResolvedValue({ id: 'school-1' } as School);

    await expect(
      service.createSchool({
        name: 'Colegio Uno',
        slug: 'colegio-uno'
      })
    ).rejects.toThrow(ConflictException);
  });

  it('throws when a school is not found', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
  });
});
