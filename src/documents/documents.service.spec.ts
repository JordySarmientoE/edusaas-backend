import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { AttendanceRecord, AttendanceStatus } from '../attendance/entities/attendance-record.entity';
import { StorageService } from '../common/services/storage.service';
import { GradeScale } from '../school-config/entities/school-config.entity';
import { SchoolConfigService } from '../school-config/school-config.service';
import { SchoolsService } from '../schools/schools.service';
import { Role } from '../common/enums/role.enum';
import { UsersService } from '../users/users.service';
import { GradeRecord } from '../grades/entities/grade-record.entity';
import { DocumentsService } from './documents.service';
import { DocumentTemplate, DocumentType } from './entities/document-template.entity';
import { IssuedDocument } from './entities/issued-document.entity';
import {
  DocumentAttendanceRecordsRepository,
  DocumentGradeRecordsRepository,
  DocumentTemplatesRepository,
  IssuedDocumentsRepository
} from './repositories';
import { PdfGeneratorService } from './services/pdf-generator.service';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let templatesRepository: jest.Mocked<Repository<DocumentTemplate>>;
  let issuedDocumentsRepository: jest.Mocked<Repository<IssuedDocument>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        DocumentsService,
        PdfGeneratorService,
        {
          provide: DocumentTemplatesRepository,
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn()
          }
        },
        {
          provide: IssuedDocumentsRepository,
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn()
          }
        },
        {
          provide: DocumentGradeRecordsRepository,
          useValue: {
            find: jest.fn().mockResolvedValue([
              {
                id: 'grade-1',
                evaluationName: 'Parcial 1',
                rawScore: 18,
                scaledScore: '18',
                cycleId: 'cycle-1',
                classId: 'class-1',
                isClosed: false
              }
            ])
          }
        },
        {
          provide: DocumentAttendanceRecordsRepository,
          useValue: {
            find: jest.fn().mockResolvedValue([
              {
                id: 'attendance-1',
                status: AttendanceStatus.PRESENT,
                attendanceDate: '2026-03-28'
              }
            ])
          }
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'student-1',
              firstName: 'Ana',
              lastName: 'Pérez',
              email: 'ana@example.com',
              role: Role.STUDENT
            }),
            ensureUserHasRoleInSchool: jest.fn().mockResolvedValue(Role.STUDENT)
          }
        },
        {
          provide: SchoolsService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              id: 'school-1',
              name: 'Colegio Demo',
              slug: 'colegio-demo'
            })
          }
        },
        {
          provide: SchoolConfigService,
          useValue: {
            getConfig: jest.fn().mockResolvedValue({
              logoUrl: null,
              principalName: 'Directora Demo',
              gradingScale: GradeScale.NUMERIC_20
            })
          }
        },
        {
          provide: StorageService,
          useValue: {
            storeIssuedDocument: jest.fn().mockResolvedValue('/uploads/documents/doc-1.pdf')
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

    service = moduleRef.get(DocumentsService);
    templatesRepository = moduleRef.get(DocumentTemplatesRepository);
    issuedDocumentsRepository = moduleRef.get(IssuedDocumentsRepository);
    eventEmitter = moduleRef.get(EventEmitter2);
  });

  it('creates a template', async () => {
    templatesRepository.findOne.mockResolvedValue(null);
    templatesRepository.create.mockReturnValue({ name: 'Constancia' } as DocumentTemplate);
    templatesRepository.save.mockResolvedValue({ id: 'template-1' } as DocumentTemplate);

    const result = await service.createTemplate(
      {
        name: 'Constancia',
        type: DocumentType.CONSTANCY,
        htmlContent: '<h1>{{student.fullName}}</h1>'
      },
      'school-1'
    );

    expect(result.id).toBe('template-1');
  });

  it('rejects duplicate template names', async () => {
    templatesRepository.findOne.mockResolvedValue({ id: 'template-1' } as DocumentTemplate);

    await expect(
      service.createTemplate(
        {
          name: 'Constancia',
          type: DocumentType.CONSTANCY,
          htmlContent: '<h1>Demo</h1>'
        },
        'school-1'
      )
    ).rejects.toThrow(ConflictException);
  });

  it('issues a document and stores history', async () => {
    templatesRepository.findOne.mockResolvedValue({
      id: 'template-1',
      schoolId: 'school-1',
      name: 'Constancia',
      type: DocumentType.CONSTANCY,
      htmlContent: '<h1>{{student.fullName}}</h1>',
      isActive: true
    } as DocumentTemplate);
    issuedDocumentsRepository.create.mockReturnValue({
      title: 'Constancia - Ana Pérez'
    } as IssuedDocument);
    issuedDocumentsRepository.save.mockResolvedValue({
      id: 'document-1',
      title: 'Constancia - Ana Pérez',
      fileUrl: '/uploads/documents/doc-1.pdf',
      documentType: DocumentType.CONSTANCY
    } as IssuedDocument);

    const result = await service.issueDocument(
      {
        templateId: 'template-1',
        studentId: 'student-1'
      },
      'school-1',
      'admin-1'
    );

    expect(result.document.id).toBe('document-1');
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'document.issued',
      expect.objectContaining({ documentId: 'document-1', studentId: 'student-1' })
    );
  });

  it('fails when template does not exist', async () => {
    templatesRepository.findOne.mockResolvedValue(null);

    await expect(
      service.issueDocument(
        {
          templateId: 'missing',
          studentId: 'student-1'
        },
        'school-1',
        'admin-1'
      )
    ).rejects.toThrow(NotFoundException);
  });

  it('returns document history for a student', async () => {
    issuedDocumentsRepository.find.mockResolvedValue([{ id: 'doc-1' }] as never);
    const result = await service.getDocumentHistory('student-1', 'school-1');
    expect(result).toHaveLength(1);
  });
});
