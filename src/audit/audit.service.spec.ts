import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { AuditService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogsRepository } from './repositories';

describe('AuditService', () => {
  let service: AuditService;
  let repository: jest.Mocked<Repository<AuditLog>>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: AuditLogsRepository,
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn()
          }
        }
      ]
    }).compile();

    service = moduleRef.get(AuditService);
    repository = moduleRef.get(AuditLogsRepository);
  });

  it('persists logs with default metadata', async () => {
    const entity = { action: 'POST /audit-logs' } as AuditLog;
    repository.create.mockReturnValue(entity);
    repository.save.mockResolvedValue(entity);

    await service.log({
      action: 'POST /audit-logs',
      entityType: 'audit-logs'
    });

    expect(repository.create).toHaveBeenCalledWith({
      action: 'POST /audit-logs',
      entityType: 'audit-logs',
      metadata: {}
    });
    expect(repository.save).toHaveBeenCalledWith(entity);
  });

  it('returns paginated history', async () => {
    const queryBuilder = {
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[{ id: '1' }], 1])
    };
    repository.createQueryBuilder.mockReturnValue(queryBuilder as never);

    const result = await service.getHistory({ page: 1, limit: 10 }, 'school-1');

    expect(queryBuilder.andWhere).toHaveBeenCalledWith('audit.schoolId = :schoolId', {
      schoolId: 'school-1'
    });
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
  });
});
