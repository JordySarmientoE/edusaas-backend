import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { SchoolsService } from '../schools/schools.service';
import { AcademicCyclesService } from './academic-cycles.service';
import { AcademicCycle } from './entities/academic-cycle.entity';
import { Course } from './entities/course.entity';
import { GradeCourseConfig } from './entities/grade-course-config.entity';
import { GradeLevel } from './entities/grade.entity';
import { Grade } from './entities/grade.entity';
import { Section } from './entities/section.entity';
import {
  AcademicCoursesRepository,
  AcademicCyclesRepository,
  AcademicGradesRepository,
  AcademicSectionsRepository,
  GradeCourseConfigsRepository
} from './repositories';

describe('AcademicCyclesService', () => {
  let service: AcademicCyclesService;
  let cyclesRepository: jest.Mocked<Repository<AcademicCycle>>;
  let gradesRepository: jest.Mocked<Repository<Grade>>;
  let sectionsRepository: jest.Mocked<Repository<Section>>;
  let coursesRepository: jest.Mocked<Repository<Course>>;
  let gradeCourseConfigsRepository: jest.Mocked<Repository<GradeCourseConfig>>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AcademicCyclesService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn(() => ({
              count: jest.fn().mockResolvedValue(0)
            }))
          }
        },
        {
          provide: AcademicCyclesRepository,
          useValue: { findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn() }
        },
        {
          provide: AcademicGradesRepository,
          useValue: { findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn() }
        },
        {
          provide: AcademicSectionsRepository,
          useValue: { findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn() }
        },
        {
          provide: AcademicCoursesRepository,
          useValue: { findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn() }
        },
        {
          provide: GradeCourseConfigsRepository,
          useValue: { findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn() }
        },
        {
          provide: SchoolsService,
          useValue: { findById: jest.fn().mockResolvedValue({ id: 'school-1' }) }
        }
      ]
    }).compile();

    service = moduleRef.get(AcademicCyclesService);
    cyclesRepository = moduleRef.get(AcademicCyclesRepository);
    gradesRepository = moduleRef.get(AcademicGradesRepository);
    sectionsRepository = moduleRef.get(AcademicSectionsRepository);
    coursesRepository = moduleRef.get(AcademicCoursesRepository);
    gradeCourseConfigsRepository = moduleRef.get(GradeCourseConfigsRepository);
  });

  it('creates a cycle', async () => {
    cyclesRepository.findOne.mockResolvedValue(null);
    cyclesRepository.create.mockReturnValue({ name: '2026' } as AcademicCycle);
    cyclesRepository.save.mockResolvedValue({ id: 'cycle-1', name: '2026' } as AcademicCycle);

    const result = await service.createCycle({ name: '2026', year: 2026 }, 'school-1');

    expect(result.id).toBe('cycle-1');
  });

  it('rejects duplicate cycle names', async () => {
    cyclesRepository.findOne.mockResolvedValue({ id: 'cycle-1' } as AcademicCycle);
    await expect(service.createCycle({ name: '2026', year: 2026 }, 'school-1')).rejects.toThrow(ConflictException);
  });

  it('creates grade, course config and section', async () => {
    cyclesRepository.findOne.mockResolvedValue({ id: 'cycle-1', schoolId: 'school-1' } as AcademicCycle);
    gradesRepository.findOne.mockResolvedValue(null);
    gradesRepository.create.mockReturnValue({ id: 'grade-1', schoolId: 'school-1', level: GradeLevel.PRIMARY } as unknown as Grade);
    gradesRepository.save.mockResolvedValue({ id: 'grade-1', schoolId: 'school-1', level: GradeLevel.PRIMARY } as unknown as Grade);
    coursesRepository.findOne.mockResolvedValue({ id: 'course-1', schoolId: 'school-1', name: 'Matemática' } as Course);
    gradeCourseConfigsRepository.findOne.mockResolvedValue(null);
    gradeCourseConfigsRepository.create.mockReturnValue({ id: 'config-1', gradeId: 'grade-1', courseId: 'course-1' } as GradeCourseConfig);
    gradeCourseConfigsRepository.save.mockResolvedValue({ id: 'config-1', gradeId: 'grade-1', courseId: 'course-1' } as GradeCourseConfig);
    sectionsRepository.findOne.mockResolvedValue(null);
    sectionsRepository.create.mockReturnValue({ id: 'section-1', gradeId: 'grade-1', cycleId: 'cycle-1' } as unknown as Section);
    sectionsRepository.save.mockResolvedValue({ id: 'section-1', gradeId: 'grade-1', cycleId: 'cycle-1' } as unknown as Section);

    const grade = await service.createGrade({ name: 'Primaria 1', level: GradeLevel.PRIMARY, order: 1 }, 'school-1');
    gradesRepository.findOne.mockResolvedValue({ id: 'grade-1', schoolId: 'school-1', level: GradeLevel.PRIMARY, order: 1 } as unknown as Grade);
    const gradeCourse = await service.configureGradeCourse('grade-1', { courseId: 'course-1', order: 1 }, 'school-1');
    const section = await service.createSection('cycle-1', { gradeId: 'grade-1', name: 'A' }, 'school-1');

    expect(grade.id).toBe('grade-1');
    expect(gradeCourse.id).toBe('config-1');
    expect(section.id).toBe('section-1');
  });

  it('throws when cycle does not exist', async () => {
    cyclesRepository.findOne.mockResolvedValue(null);
    await expect(service.findById('missing', 'school-1')).rejects.toThrow(NotFoundException);
  });
});
