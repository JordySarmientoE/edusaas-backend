import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { AcademicCycle } from '../academic-cycles/entities/academic-cycle.entity';
import { Grade } from '../academic-cycles/entities/grade.entity';
import { AttendanceRecord, AttendanceStatus } from '../attendance/entities/attendance-record.entity';
import { SchoolClass } from '../classes/entities/class.entity';
import { Incident, IncidentSeverity } from '../discipline/entities/incident.entity';
import { IssuedDocument } from '../documents/entities/issued-document.entity';
import { PdfGeneratorService } from '../documents/services/pdf-generator.service';
import { Enrollment } from '../enrollment/entities/enrollment.entity';
import { GradesService } from '../grades/grades.service';
import { GradeRecord } from '../grades/entities/grade-record.entity';
import { SchoolConfigService } from '../school-config/school-config.service';
import { SchoolsService } from '../schools/schools.service';
import { Task } from '../tasks/entities/task.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { ExportableEntity } from './enums/exportable-entity.enum';
import { ReportsService } from './reports.service';
import {
  ReportsAcademicCyclesRepository,
  ReportsAcademicGradesRepository,
  ReportsAttendanceRepository,
  ReportsClassesRepository,
  ReportsEnrollmentsRepository,
  ReportsGradesRepository,
  ReportsIncidentsRepository,
  ReportsIssuedDocumentsRepository,
  ReportsTasksRepository,
  ReportsUsersRepository
} from './repositories';

describe('ReportsService', () => {
  let service: ReportsService;
  let attendanceRepository: jest.Mocked<Repository<AttendanceRecord>>;
  let gradesRepository: jest.Mocked<Repository<GradeRecord>>;
  let tasksRepository: jest.Mocked<Repository<Task>>;
  let incidentsRepository: jest.Mocked<Repository<Incident>>;
  let classesRepository: jest.Mocked<Repository<SchoolClass>>;
  let academicGradesRepository: jest.Mocked<Repository<Grade>>;
  let cyclesRepository: jest.Mocked<Repository<AcademicCycle>>;
  let usersRepository: jest.Mocked<Repository<User>>;
  let enrollmentsRepository: jest.Mocked<Repository<Enrollment>>;
  let issuedDocumentsRepository: jest.Mocked<Repository<IssuedDocument>>;
  let schoolsService: { findById: jest.Mock };
  let usersService: {
    findAll: jest.Mock;
    findById: jest.Mock;
    ensureUserCanAccessLinkedStudentsInSchool: jest.Mock;
    getLinkedStudentsForParent: jest.Mock;
  };
  let gradesService: {
    getClassSummary: jest.Mock;
    getStudentSummaries: jest.Mock;
  };
  let schoolConfigService: {
    getConfig: jest.Mock;
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: ReportsAttendanceRepository,
          useValue: { find: jest.fn() }
        },
        {
          provide: ReportsGradesRepository,
          useValue: { find: jest.fn() }
        },
        {
          provide: ReportsTasksRepository,
          useValue: { find: jest.fn() }
        },
        {
          provide: ReportsIncidentsRepository,
          useValue: { find: jest.fn() }
        },
        {
          provide: ReportsClassesRepository,
          useValue: { find: jest.fn(), findOne: jest.fn() }
        },
        {
          provide: ReportsAcademicGradesRepository,
          useValue: { find: jest.fn() }
        },
        {
          provide: ReportsAcademicCyclesRepository,
          useValue: { findOne: jest.fn() }
        },
        {
          provide: ReportsUsersRepository,
          useValue: { find: jest.fn() }
        },
        {
          provide: ReportsEnrollmentsRepository,
          useValue: { find: jest.fn() }
        },
        {
          provide: ReportsIssuedDocumentsRepository,
          useValue: { find: jest.fn() }
        },
        {
          provide: GradesService,
          useValue: {
            getClassSummary: jest.fn(),
            getStudentSummaries: jest.fn()
          }
        },
        {
          provide: SchoolsService,
          useValue: {
            findById: jest.fn()
          }
        },
        {
          provide: SchoolConfigService,
          useValue: {
            getConfig: jest.fn()
          }
        },
        {
          provide: UsersService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            ensureUserCanAccessLinkedStudentsInSchool: jest.fn(),
            getLinkedStudentsForParent: jest.fn()
          }
        },
        {
          provide: PdfGeneratorService,
          useValue: {}
        }
      ]
    }).compile();

    service = moduleRef.get(ReportsService);
    attendanceRepository = moduleRef.get(ReportsAttendanceRepository);
    gradesRepository = moduleRef.get(ReportsGradesRepository);
    tasksRepository = moduleRef.get(ReportsTasksRepository);
    incidentsRepository = moduleRef.get(ReportsIncidentsRepository);
    classesRepository = moduleRef.get(ReportsClassesRepository);
    academicGradesRepository = moduleRef.get(ReportsAcademicGradesRepository);
    cyclesRepository = moduleRef.get(ReportsAcademicCyclesRepository);
    usersRepository = moduleRef.get(ReportsUsersRepository);
    enrollmentsRepository = moduleRef.get(ReportsEnrollmentsRepository);
    issuedDocumentsRepository = moduleRef.get(ReportsIssuedDocumentsRepository);
    schoolsService = moduleRef.get(SchoolsService);
    usersService = moduleRef.get(UsersService);
    gradesService = moduleRef.get(GradesService);
    schoolConfigService = moduleRef.get(SchoolConfigService);
  });

  it('calculates attendance KPI', async () => {
    classesRepository.find.mockResolvedValue([{ id: 'class-1' }] as never);
    attendanceRepository.find.mockResolvedValue([
      { status: AttendanceStatus.PRESENT },
      { status: AttendanceStatus.LATE },
      { status: AttendanceStatus.ABSENT }
    ] as never);

    const result = await service.getAttendanceKpi('school-1', 'cycle-1');

    expect(result.attendancePercentage).toBe(66.67);
  });

  it('calculates grades KPI grouped by grade', async () => {
    classesRepository.find.mockResolvedValue([
      { id: 'class-1', gradeId: 'grade-1' },
      { id: 'class-2', gradeId: 'grade-2' }
    ] as never);
    academicGradesRepository.find.mockResolvedValue([
      { id: 'grade-1', name: 'Primero' },
      { id: 'grade-2', name: 'Segundo' }
    ] as never);
    gradesRepository.find.mockResolvedValue([
      { classId: 'class-1', rawScore: 18 },
      { classId: 'class-1', rawScore: 16 },
      { classId: 'class-2', rawScore: 14 }
    ] as never);

    const result = await service.getGradesKpi('school-1', 'cycle-1');

    expect(result.overallAverage).toBe(16);
    expect(result.averagesByGrade).toHaveLength(2);
  });

  it('calculates pending tasks KPI', async () => {
    tasksRepository.find.mockResolvedValue([
      { classId: 'class-1' },
      { classId: 'class-1' },
      { classId: 'class-2' }
    ] as never);
    classesRepository.find.mockResolvedValue([
      { id: 'class-1', name: 'Matemática' },
      { id: 'class-2', name: 'Comunicación' }
    ] as never);

    const result = await service.getPendingTasksKpi('school-1');

    expect(result.totalPendingTasks).toBe(3);
    expect(result.pendingByClass[0].total).toBeGreaterThan(0);
  });

  it('calculates discipline KPI by severity', async () => {
    cyclesRepository.findOne.mockResolvedValue({
      id: 'cycle-1',
      startDate: '2026-03-01',
      endDate: '2026-12-20'
    } as AcademicCycle);
    incidentsRepository.find.mockResolvedValue([
      { severity: IncidentSeverity.MINOR },
      { severity: IncidentSeverity.SEVERE },
      { severity: IncidentSeverity.SEVERE }
    ] as never);

    const result = await service.getDisciplineKpi('school-1', 'cycle-1');

    expect(result.totalIncidents).toBe(3);
    expect(result.bySeverity.severe).toBe(2);
  });

  it('exports users to csv', async () => {
    schoolsService.findById.mockResolvedValue({ id: 'school-1', name: 'Colegio Demo' });
    usersService.findAll.mockResolvedValue({
      data: [
        {
          userId: 'user-1',
          membershipId: 'membership-1',
          schoolId: 'school-1',
          schoolName: 'Colegio Demo',
          firstName: 'Ana',
          lastName: 'Pérez',
          email: 'ana@example.com',
          role: 'student',
          status: 'active',
          isActive: true,
          createdAt: new Date('2026-03-28T00:00:00.000Z')
        }
      ],
      total: 1,
      page: 1,
      totalPages: 1
    });

    const buffer = await service.exportToCsv(
      ExportableEntity.USERS,
      { entity: ExportableEntity.USERS },
      'school-1'
    );

    expect(buffer.toString('utf8')).toContain('Ana');
  });

  it('exports users to excel', async () => {
    schoolsService.findById.mockResolvedValue({ id: 'school-1', name: 'Colegio Demo' });
    usersService.findAll.mockResolvedValue({
      data: [
        {
          userId: 'user-1',
          membershipId: 'membership-1',
          schoolId: 'school-1',
          schoolName: 'Colegio Demo',
          firstName: 'Ana',
          lastName: 'Pérez',
          email: 'ana@example.com',
          role: 'student',
          status: 'active',
          isActive: true,
          createdAt: new Date('2026-03-28T00:00:00.000Z')
        }
      ],
      total: 1,
      page: 1,
      totalPages: 1
    });

    const buffer = await service.exportToExcel(
      ExportableEntity.USERS,
      { entity: ExportableEntity.USERS },
      'school-1'
    );

    expect(buffer.length).toBeGreaterThan(0);
  });

  it('returns empty csv buffer when there are no rows', async () => {
    tasksRepository.find.mockResolvedValue([]);

    const buffer = await service.exportToCsv(
      ExportableEntity.TASKS,
      { entity: ExportableEntity.TASKS },
      'school-1'
    );

    expect(buffer.toString('utf8')).toBe('');
  });

  it('exports classes with related labels to csv', async () => {
    classesRepository.find.mockResolvedValue([
      {
        name: 'Matemática',
        displayName: 'Matemática 1A',
        isActive: true,
        createdAt: new Date('2026-03-30T10:00:00.000Z'),
        course: { name: 'Álgebra' },
        cycle: { name: '2026' },
        grade: { name: 'Primero' },
        section: { name: 'A' },
        teacher: { firstName: 'Ana', lastName: 'Pérez' }
      }
    ] as never);

    const buffer = await service.exportToCsv(
      ExportableEntity.CLASSES,
      { entity: ExportableEntity.CLASSES, cycleId: 'cycle-1' },
      'school-1'
    );

    const csv = buffer.toString('utf8');
    expect(csv).toContain('Matemática 1A');
    expect(csv).toContain('Álgebra');
    expect(csv).toContain('Ana Pérez');
  });

  it('exports enrollments and documents with readable labels', async () => {
    enrollmentsRepository.find.mockResolvedValue([
      {
        firstName: 'Lucía',
        lastName: 'Gómez',
        email: 'lucia@example.com',
        phoneNumber: '999999999',
        createdAt: new Date('2026-03-30T10:00:00.000Z'),
        status: 'accepted',
        cycle: { name: '2026' },
        section: { name: 'A', grade: { name: 'Primero' } },
        studentUser: { firstName: 'Lucía', lastName: 'Gómez' }
      }
    ] as never);
    issuedDocumentsRepository.find.mockResolvedValue([
      {
        title: 'Constancia de estudios',
        documentType: 'certificate',
        fileUrl: '/docs/constancia.pdf',
        createdAt: new Date('2026-03-30T10:00:00.000Z'),
        template: { name: 'Base' },
        student: { firstName: 'Lucía', lastName: 'Gómez' },
        issuedBy: { firstName: 'Ana', lastName: 'Pérez' }
      }
    ] as never);

    const enrollmentCsv = await service.exportToCsv(
      ExportableEntity.ENROLLMENTS,
      { entity: ExportableEntity.ENROLLMENTS, cycleId: 'cycle-1' },
      'school-1'
    );
    const documentsCsv = await service.exportToCsv(
      ExportableEntity.DOCUMENTS,
      { entity: ExportableEntity.DOCUMENTS },
      'school-1'
    );

    expect(enrollmentCsv.toString('utf8')).toContain('Aceptada');
    expect(documentsCsv.toString('utf8')).toContain('Certificado');
    expect(documentsCsv.toString('utf8')).toContain('Constancia de estudios');
  });

  it('throws when exporting a grade control pdf for a missing class', async () => {
    classesRepository.findOne.mockResolvedValue(null);

    await expect(service.exportGradesControlPdf('class-x', 'school-1')).rejects.toThrow(NotFoundException);
  });

  it('rejects child report export for unlinked student', async () => {
    usersService.findById.mockResolvedValue({ id: 'parent-1' });
    usersService.ensureUserCanAccessLinkedStudentsInSchool.mockResolvedValue(undefined);
    usersService.getLinkedStudentsForParent.mockResolvedValue([{ id: 'student-2' }]);

    await expect(
      service.exportChildReportCardPdf('parent-1', 'student-1', 'school-1', 'cycle-1')
    ).rejects.toThrow('El estudiante no está vinculado a este padre');
  });

  it('throws if the cycle does not exist for discipline KPI', async () => {
    cyclesRepository.findOne.mockResolvedValue(null);

    await expect(service.getDisciplineKpi('school-1', 'cycle-x')).rejects.toThrow(NotFoundException);
  });

  it('returns zeroed grade KPI when there are no grade records', async () => {
    classesRepository.find.mockResolvedValue([{ id: 'class-1', gradeId: 'grade-1' }] as never);
    academicGradesRepository.find.mockResolvedValue([{ id: 'grade-1', name: 'Primero' }] as never);
    gradesRepository.find.mockResolvedValue([]);

    const result = await service.getGradesKpi('school-1', 'cycle-1');

    expect(result).toEqual({
      cycleId: 'cycle-1',
      overallAverage: 0,
      averagesByGrade: [{ gradeId: 'grade-1', gradeName: 'Primero', average: 0 }]
    });
  });

  it('returns zero pending tasks KPI when there are no future tasks', async () => {
    tasksRepository.find.mockResolvedValue([]);

    const result = await service.getPendingTasksKpi('school-1');

    expect(result).toEqual({
      totalPendingTasks: 0,
      pendingByClass: []
    });
  });

  it('rejects exporting a grade control pdf for a class outside the selected cycle', async () => {
    classesRepository.findOne.mockResolvedValue({
      id: 'class-1',
      schoolId: 'school-1',
      cycleId: 'cycle-1'
    } as SchoolClass);

    await expect(service.exportGradesControlPdf('class-1', 'school-1', 'cycle-2')).rejects.toThrow(
      BadRequestException
    );
  });

  it('fails exporting a student report card when the cycle is missing', async () => {
    usersService.findById.mockResolvedValue({ id: 'student-1', firstName: 'Ana', lastName: 'Perez' });
    schoolsService.findById.mockResolvedValue({ id: 'school-1', name: 'Colegio Demo' });
    schoolConfigService.getConfig.mockResolvedValue({ gradingScale: 'numeric_20', logoUrl: null });
    cyclesRepository.findOne.mockResolvedValue(null);
    gradesService.getStudentSummaries.mockResolvedValue([]);

    await expect(service.exportStudentReportCardPdf('student-1', 'school-1', 'cycle-x')).rejects.toThrow(
      NotFoundException
    );
  });
});
