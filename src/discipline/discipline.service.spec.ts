import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { IncidentSeverity, Incident } from './entities/incident.entity';
import { DisciplineService } from './discipline.service';
import { IncidentsRepository } from './repositories';

describe('DisciplineService', () => {
  let service: DisciplineService;
  let repository: jest.Mocked<Repository<Incident>>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        DisciplineService,
        {
          provide: IncidentsRepository,
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn()
          }
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({ id: 'student-1' })
          }
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn()
          }
        }
      ]
    }).compile();

    service = moduleRef.get(DisciplineService);
    repository = moduleRef.get(IncidentsRepository);
  });

  it('creates an incident and emits event', async () => {
    repository.create.mockReturnValue({ severity: IncidentSeverity.MINOR } as Incident);
    repository.save.mockResolvedValue({ id: 'incident-1' } as Incident);

    const result = await service.createIncident(
      {
        studentId: 'student-1',
        severity: IncidentSeverity.MINOR,
        description: 'Llegó tarde'
      },
      'school-1',
      'teacher-1'
    );

    expect(result.id).toBe('incident-1');
  });

  it('updates incident', async () => {
    repository.findOne.mockResolvedValue({ id: 'incident-1', description: 'Old' } as Incident);
    repository.save.mockResolvedValue({ id: 'incident-1', description: 'New' } as Incident);

    const result = await service.updateIncident('incident-1', { description: 'New' }, 'school-1');

    expect(result.description).toBe('New');
  });
});
