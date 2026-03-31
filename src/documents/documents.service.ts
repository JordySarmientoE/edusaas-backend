import {
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AttendanceRecord, AttendanceStatus } from '../attendance/entities/attendance-record.entity';
import { StorageService } from '../common/services/storage.service';
import { GradeRecord } from '../grades/entities/grade-record.entity';
import { SchoolConfigService } from '../school-config/school-config.service';
import { SchoolsService } from '../schools/schools.service';
import { Role } from '../common/enums/role.enum';
import { UsersService } from '../users/users.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { GenerateDocumentDto } from './dto/generate-document.dto';
import { DocumentTemplate, DocumentType } from './entities/document-template.entity';
import { IssuedDocument } from './entities/issued-document.entity';
import {
  DocumentAttendanceRecordsRepository,
  DocumentGradeRecordsRepository,
  DocumentTemplatesRepository,
  IssuedDocumentsRepository
} from './repositories';
import { PdfGeneratorService } from './services/pdf-generator.service';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly templatesRepository: DocumentTemplatesRepository,
    private readonly issuedDocumentsRepository: IssuedDocumentsRepository,
    private readonly gradesRepository: DocumentGradeRecordsRepository,
    private readonly attendanceRepository: DocumentAttendanceRecordsRepository,
    private readonly usersService: UsersService,
    private readonly schoolsService: SchoolsService,
    private readonly schoolConfigService: SchoolConfigService,
    private readonly storageService: StorageService,
    private readonly pdfGeneratorService: PdfGeneratorService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async createTemplate(dto: CreateTemplateDto, schoolId: string): Promise<DocumentTemplate> {
    await this.schoolsService.findById(schoolId);

    const existing = await this.templatesRepository.findOne({
      where: {
        schoolId,
        name: dto.name
      }
    });

    if (existing) {
      throw new ConflictException('Ya existe una plantilla con ese nombre');
    }

    const template = this.templatesRepository.create({
      schoolId,
      name: dto.name,
      type: dto.type,
      htmlContent: dto.htmlContent,
      isActive: dto.isActive ?? true
    });

    return this.templatesRepository.save(template);
  }

  async getTemplates(schoolId: string): Promise<DocumentTemplate[]> {
    return this.templatesRepository.find({
      where: { schoolId },
      order: { createdAt: 'DESC' }
    });
  }

  async generateDocument(
    dto: GenerateDocumentDto,
    schoolId: string,
    issuedById?: string
  ): Promise<Buffer> {
    const { buffer } = await this.issueDocument(dto, schoolId, issuedById);
    return buffer;
  }

  async issueDocument(
    dto: GenerateDocumentDto,
    schoolId: string,
    issuedById?: string
  ): Promise<{ document: IssuedDocument; buffer: Buffer }> {
    const template = await this.templatesRepository.findOne({
      where: {
        id: dto.templateId,
        schoolId,
        isActive: true
      }
    });

    if (!template) {
      throw new NotFoundException('Plantilla no encontrada');
    }

    const student = await this.usersService.findById(dto.studentId, schoolId);
    await this.usersService.ensureUserHasRoleInSchool(dto.studentId, schoolId, [Role.STUDENT]);

    const school = await this.schoolsService.findById(schoolId);
    const config = await this.schoolConfigService.getConfig(schoolId);
    const grades = await this.gradesRepository.find({
      where: { schoolId, studentId: student.id },
      order: { createdAt: 'DESC' }
    });
    const attendance = await this.attendanceRepository.find({
      where: { schoolId, studentId: student.id },
      order: { attendanceDate: 'DESC' }
    });

    const context = this.buildDocumentContext({
      school,
      config,
      student,
      grades,
      attendance,
      extraData: dto.data ?? {}
    });

    const renderedHtml = this.pdfGeneratorService.renderTemplate(template.htmlContent, context);
    const buffer = this.pdfGeneratorService.generateFromHtml(renderedHtml);
    const resolvedDocumentType = dto.documentType ?? template.type ?? DocumentType.CUSTOM;
    const title = dto.title ?? `${template.name} - ${student.firstName} ${student.lastName}`;
    const fileUrl = await this.storageService.storeIssuedDocument(buffer, title);

    const issuedDocument = await this.issuedDocumentsRepository.save(
      this.issuedDocumentsRepository.create({
        schoolId,
        templateId: template.id,
        studentId: student.id,
        issuedById: issuedById ?? null,
        documentType: resolvedDocumentType,
        title,
        fileUrl,
        payload: context
      })
    );

    this.eventEmitter.emit('document.issued', {
      schoolId,
      studentId: student.id,
      documentId: issuedDocument.id,
      title
    });

    return { document: issuedDocument, buffer };
  }

  async getDocumentHistory(studentId: string, schoolId: string): Promise<IssuedDocument[]> {
    await this.usersService.findById(studentId, schoolId);
    return this.issuedDocumentsRepository.find({
      where: { schoolId, studentId },
      order: { createdAt: 'DESC' }
    });
  }

  private buildDocumentContext(input: {
    school: Awaited<ReturnType<SchoolsService['findById']>>;
    config: Awaited<ReturnType<SchoolConfigService['getConfig']>>;
    student: Awaited<ReturnType<UsersService['findById']>>;
    grades: GradeRecord[];
    attendance: AttendanceRecord[];
    extraData: Record<string, unknown>;
  }): Record<string, unknown> {
    const attendanceSummary = {
      total: input.attendance.length,
      present: input.attendance.filter((record) => record.status === AttendanceStatus.PRESENT).length,
      absent: input.attendance.filter((record) => record.status === AttendanceStatus.ABSENT).length,
      late: input.attendance.filter((record) => record.status === AttendanceStatus.LATE).length
    };

    return {
      school: {
        id: input.school.id,
        name: input.school.name,
        slug: input.school.slug,
        principalName: input.config.principalName,
        logoUrl: input.config.logoUrl
      },
      student: {
        id: input.student.id,
        firstName: input.student.firstName,
        lastName: input.student.lastName,
        fullName: `${input.student.firstName} ${input.student.lastName}`.trim(),
        email: input.student.email
      },
      grades: input.grades.map((grade) => ({
        id: grade.id,
        evaluationName: grade.evaluationName,
        rawScore: grade.rawScore,
        scaledScore: grade.scaledScore,
        cycleId: grade.cycleId,
        classId: grade.classId,
        isClosed: grade.isClosed
      })),
      attendanceSummary,
      generatedAt: new Date().toISOString(),
      extra: input.extraData
    };
  }
}
