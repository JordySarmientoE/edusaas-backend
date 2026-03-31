import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Between, FindOptionsWhere, In, MoreThanOrEqual } from 'typeorm';
import { AttendanceStatus } from '../attendance/entities/attendance-record.entity';
import { Incident, IncidentSeverity } from '../discipline/entities/incident.entity';
import { PdfGeneratorService } from '../documents/services/pdf-generator.service';
import { DocumentType } from '../documents/entities/document-template.entity';
import { IssuedDocument } from '../documents/entities/issued-document.entity';
import { Enrollment, EnrollmentStatus } from '../enrollment/entities/enrollment.entity';
import { GradesService } from '../grades/grades.service';
import { SchoolConfigService } from '../school-config/school-config.service';
import { SchoolsService } from '../schools/schools.service';
import { UsersService } from '../users/users.service';
import { SchoolMembershipStatus } from '../users/entities/school-membership.entity';
import { ExportFiltersDto } from './dto/export-filters.dto';
import { ExportableEntity } from './enums/exportable-entity.enum';
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

type ExportRow = Record<string, string | number | boolean | null>;
type PdfDocumentInstance = InstanceType<typeof PDFDocument>;

@Injectable()
export class ReportsService {
  constructor(
    private readonly attendanceRepository: ReportsAttendanceRepository,
    private readonly gradesRepository: ReportsGradesRepository,
    private readonly tasksRepository: ReportsTasksRepository,
    private readonly incidentsRepository: ReportsIncidentsRepository,
    private readonly classesRepository: ReportsClassesRepository,
    private readonly academicGradesRepository: ReportsAcademicGradesRepository,
    private readonly academicCyclesRepository: ReportsAcademicCyclesRepository,
    private readonly usersRepository: ReportsUsersRepository,
    private readonly enrollmentsRepository: ReportsEnrollmentsRepository,
    private readonly issuedDocumentsRepository: ReportsIssuedDocumentsRepository,
    private readonly gradesService: GradesService,
    private readonly schoolsService: SchoolsService,
    private readonly schoolConfigService: SchoolConfigService,
    private readonly usersService: UsersService,
    private readonly pdfGeneratorService: PdfGeneratorService
  ) {}

  async getAttendanceKpi(schoolId: string, cycleId: string) {
    const classes = await this.classesRepository.find({
      where: { schoolId, cycleId }
    });

    if (classes.length === 0) {
      return {
        cycleId,
        totalRecords: 0,
        attendedRecords: 0,
        attendancePercentage: 0
      };
    }

    const attendance = await this.attendanceRepository.find({
      where: {
        schoolId,
        classId: In(classes.map((item) => item.id))
      }
    });

    const totalRecords = attendance.length;
    const attendedRecords = attendance.filter(
      (record) => record.status === AttendanceStatus.PRESENT || record.status === AttendanceStatus.LATE
    ).length;

    return {
      cycleId,
      totalRecords,
      attendedRecords,
      attendancePercentage:
        totalRecords === 0 ? 0 : Number(((attendedRecords / totalRecords) * 100).toFixed(2))
    };
  }

  async getGradesKpi(schoolId: string, cycleId: string) {
    const classes = await this.classesRepository.find({
      where: { schoolId, cycleId }
    });

    if (classes.length === 0) {
      return {
        cycleId,
        overallAverage: 0,
        averagesByGrade: []
      };
    }

    const classMap = new Map(classes.map((item) => [item.id, item]));
    const gradeIds = [...new Set(classes.map((item) => item.gradeId))];
    const gradeLevels = await this.academicGradesRepository.find({
      where: { schoolId, id: In(gradeIds) }
    });
    const gradeNameMap = new Map(gradeLevels.map((item) => [item.id, item.name]));

    const grades = await this.gradesRepository.find({
      where: {
        schoolId,
        cycleId,
        classId: In(classes.map((item) => item.id))
      }
    });

    if (grades.length === 0) {
      return {
        cycleId,
        overallAverage: 0,
        averagesByGrade: gradeLevels.map((item) => ({
          gradeId: item.id,
          gradeName: item.name,
          average: 0
        }))
      };
    }

    const grouped = new Map<string, number[]>();

    for (const record of grades) {
      const linkedClass = classMap.get(record.classId);
      if (!linkedClass) {
        continue;
      }

      const values = grouped.get(linkedClass.gradeId) ?? [];
      values.push(Number(record.rawScore));
      grouped.set(linkedClass.gradeId, values);
    }

    const averagesByGrade = [...grouped.entries()].map(([gradeId, values]) => ({
      gradeId,
      gradeName: gradeNameMap.get(gradeId) ?? 'Sin grado',
      average: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2))
    }));

    return {
      cycleId,
      overallAverage: Number(
        (
          grades.reduce((sum, record) => sum + Number(record.rawScore), 0) / grades.length
        ).toFixed(2)
      ),
      averagesByGrade
    };
  }

  async getPendingTasksKpi(schoolId: string) {
    const today = new Date().toISOString().slice(0, 10);
    const tasks = await this.tasksRepository.find({
      where: {
        schoolId,
        dueDate: MoreThanOrEqual(today)
      }
    });

    if (tasks.length === 0) {
      return {
        totalPendingTasks: 0,
        pendingByClass: []
      };
    }

    const classIds = [...new Set(tasks.map((task) => task.classId))];
    const classes = await this.classesRepository.find({
      where: { schoolId, id: In(classIds) }
    });
    const classNameMap = new Map(classes.map((item) => [item.id, item.name]));

    const grouped = new Map<string, number>();
    for (const task of tasks) {
      grouped.set(task.classId, (grouped.get(task.classId) ?? 0) + 1);
    }

    return {
      totalPendingTasks: tasks.length,
      pendingByClass: [...grouped.entries()].map(([classId, total]) => ({
        classId,
        className: classNameMap.get(classId) ?? 'Clase sin nombre',
        total
      }))
    };
  }

  async getDisciplineKpi(schoolId: string, cycleId: string) {
    const cycle = await this.academicCyclesRepository.findOne({
      where: { schoolId, id: cycleId }
    });

    if (!cycle) {
      throw new NotFoundException('Ciclo académico no encontrado');
    }

    const where: FindOptionsWhere<Incident> = { schoolId };
    if (cycle.startDate && cycle.endDate) {
      Object.assign(where, {
        createdAt: Between(new Date(cycle.startDate), new Date(`${cycle.endDate}T23:59:59.999Z`))
      });
    }

    const incidents = await this.incidentsRepository.find({ where });
    const bySeverity = {
      minor: incidents.filter((item) => item.severity === IncidentSeverity.MINOR).length,
      moderate: incidents.filter((item) => item.severity === IncidentSeverity.MODERATE).length,
      severe: incidents.filter((item) => item.severity === IncidentSeverity.SEVERE).length
    };

    return {
      cycleId,
      totalIncidents: incidents.length,
      bySeverity
    };
  }

  async exportToCsv(entity: ExportableEntity, filters: ExportFiltersDto, schoolId: string): Promise<Buffer> {
    const rows = await this.getExportRows(entity, filters, schoolId);
    if (rows.length === 0) {
      return Buffer.from('', 'utf8');
    }

    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((header) => this.escapeCsvValue(row[header]))
          .join(',')
      )
    ];

    return Buffer.from(csvLines.join('\n'), 'utf8');
  }

  async exportToExcel(
    entity: ExportableEntity,
    filters: ExportFiltersDto,
    schoolId: string
  ): Promise<Buffer> {
    const rows = await this.getExportRows(entity, filters, schoolId);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(entity);

    if (rows.length > 0) {
      worksheet.columns = Object.keys(rows[0]).map((key) => ({
        header: key,
        key,
        width: 24
      }));
      worksheet.addRows(rows);
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  async exportGradesControlPdf(classId: string, schoolId: string, cycleId?: string): Promise<Buffer> {
    const schoolClass = await this.classesRepository.findOne({ where: { id: classId, schoolId } });

    if (!schoolClass) {
      throw new NotFoundException('Clase no encontrada');
    }

    if (cycleId && schoolClass.cycleId !== cycleId) {
      throw new BadRequestException('La clase no pertenece al ciclo seleccionado');
    }

    const [summary, school, schoolConfig, cycle, grade] = await Promise.all([
      this.gradesService.getClassSummary(classId, schoolId),
      this.schoolsService.findById(schoolId),
      this.schoolConfigService.getConfig(schoolId),
      this.academicCyclesRepository.findOne({ where: { schoolId, id: schoolClass.cycleId } }),
      this.academicGradesRepository.findOne({ where: { schoolId, id: schoolClass.gradeId } })
    ]);

    const logoBuffer = await this.loadLogoBuffer(schoolConfig.logoUrl);

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer | Uint8Array) =>
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      );
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.renderGradesControlPdf(doc, {
        schoolName: school.name,
        logoBuffer,
        principalName: schoolConfig.principalName,
        classLabel: schoolClass.displayName || schoolClass.name,
        cycleLabel: cycle?.name ?? schoolClass.cycleId,
        gradeLabel: grade?.name ?? 'Sin grado',
        generatedAt: new Date(),
        summary
      });

      doc.end();
    });
  }

  async exportStudentReportCardPdf(studentId: string, schoolId: string, cycleId: string): Promise<Buffer> {
    const data = await this.buildStudentReportCardData(studentId, schoolId, cycleId);
    return this.renderStudentReportCardPdfBuffer(data);
  }

  async exportChildReportCardPdf(
    parentId: string,
    studentId: string,
    schoolId: string,
    cycleId: string
  ): Promise<Buffer> {
    await this.usersService.findById(parentId, schoolId);
    await this.usersService.ensureUserCanAccessLinkedStudentsInSchool(parentId, schoolId);
    const linkedStudents = await this.usersService.getLinkedStudentsForParent(parentId, schoolId);

    if (!linkedStudents.some((student) => student.id === studentId)) {
      throw new BadRequestException('El estudiante no está vinculado a este padre');
    }

    const data = await this.buildStudentReportCardData(studentId, schoolId, cycleId);
    return this.renderStudentReportCardPdfBuffer(data);
  }

  private async getExportRows(
    entity: ExportableEntity,
    filters: ExportFiltersDto,
    schoolId: string
  ): Promise<ExportRow[]> {
    switch (entity) {
      case ExportableEntity.USERS:
        return this.getUserExportRows(schoolId);
      case ExportableEntity.CLASSES:
        return this.getClassExportRows(filters, schoolId);
      case ExportableEntity.ENROLLMENTS:
        return this.getEnrollmentExportRows(filters, schoolId);
      case ExportableEntity.ATTENDANCE:
        return this.mapRows(
          await this.attendanceRepository.find({
            where: this.withDateFilters({ schoolId }, filters, 'attendanceDate')
          }),
          ['id', 'classId', 'studentId', 'attendanceDate', 'status', 'remarks', 'createdAt']
        );
      case ExportableEntity.GRADES:
        return this.mapRows(
          await this.gradesRepository.find({ where: this.withCycleFilter({ schoolId }, filters) }),
          [
            'id',
            'classId',
            'studentId',
            'cycleId',
            'evaluationName',
            'rawScore',
            'scaledScore',
            'isClosed',
            'createdAt'
          ]
        );
      case ExportableEntity.TASKS:
        return this.mapRows(
          await this.tasksRepository.find({
            where: this.withDateFilters({ schoolId }, filters, 'dueDate')
          }),
          ['id', 'classId', 'teacherId', 'title', 'description', 'dueDate', 'createdAt']
        );
      case ExportableEntity.INCIDENTS:
        return this.mapRows(
          await this.incidentsRepository.find({
            where: this.withCreatedAtFilters({ schoolId }, filters)
          }),
          ['id', 'studentId', 'reportedById', 'severity', 'description', 'createdAt']
        );
      case ExportableEntity.DOCUMENTS:
        return this.getDocumentExportRows(filters, schoolId);
      default:
        throw new NotFoundException('Entidad exportable no soportada');
    }
  }

  private async getUserExportRows(schoolId: string): Promise<ExportRow[]> {
    const school = await this.schoolsService.findById(schoolId);
    const memberships = await this.usersService.findAll({ page: 1, limit: 1000 }, schoolId);

    return memberships.data.map((membership) => ({
      usuario: `${membership.firstName} ${membership.lastName}`.trim(),
      correo: membership.email,
      rol: this.getRoleLabel(membership.role),
      acceso:
        membership.status === SchoolMembershipStatus.ACTIVE
          ? 'Activo'
          : membership.status === SchoolMembershipStatus.INACTIVE
            ? 'Inactivo'
            : 'Pendiente',
      telefono: membership.phoneNumber ?? '-',
      vinculos:
        String(membership.role) === 'parent'
          ? membership.linkedStudents?.map((student) => `${student.firstName} ${student.lastName}`.trim()).join(', ') || '-'
          : String(membership.role) === 'student'
            ? membership.linkedParents?.map((parent) => `${parent.firstName} ${parent.lastName}`.trim()).join(', ') || '-'
            : '-',
      colegio: membership.schoolName ?? school.name
    }));
  }

  private async getClassExportRows(filters: ExportFiltersDto, schoolId: string): Promise<ExportRow[]> {
    const classes = await this.classesRepository.find({
      where: this.withCycleFilter({ schoolId }, filters),
      relations: {
        cycle: true,
        grade: true,
        section: true,
        teacher: true,
        course: true
      }
    });

    return classes.map((schoolClass) => ({
      clase: schoolClass.displayName || schoolClass.name,
      curso: schoolClass.course?.name || schoolClass.subject || '-',
      ciclo: schoolClass.cycle?.name || '-',
      grado: schoolClass.grade?.name || '-',
      seccion: schoolClass.section?.name || '-',
      docente: schoolClass.teacher ? `${schoolClass.teacher.firstName} ${schoolClass.teacher.lastName}`.trim() : 'Sin docente',
      estado: schoolClass.isActive ? 'Activa' : 'Inactiva',
      creada: this.formatExportDate(schoolClass.createdAt)
    }));
  }

  private async getEnrollmentExportRows(filters: ExportFiltersDto, schoolId: string): Promise<ExportRow[]> {
    const enrollments = await this.enrollmentsRepository.find({
      where: this.withCycleFilter({ schoolId }, filters),
      relations: {
        cycle: true,
        section: {
          grade: true
        },
        studentUser: true
      }
    });

    return enrollments.map((enrollment) => ({
      estudiante: `${enrollment.firstName} ${enrollment.lastName}`.trim(),
      correo: enrollment.email,
      telefono: enrollment.phoneNumber ?? '-',
      ciclo: enrollment.cycle?.name || '-',
      grado: enrollment.section?.grade?.name || '-',
      seccion: enrollment.section?.name || '-',
      estado: this.getEnrollmentStatusLabel(enrollment.status),
      usuario_asociado: enrollment.studentUser ? `${enrollment.studentUser.firstName} ${enrollment.studentUser.lastName}`.trim() : 'Sin usuario',
      fecha_registro: this.formatExportDate(enrollment.createdAt)
    }));
  }

  private async getDocumentExportRows(filters: ExportFiltersDto, schoolId: string): Promise<ExportRow[]> {
    const documents = await this.issuedDocumentsRepository.find({
      where: this.withCreatedAtFilters({ schoolId }, filters),
      relations: {
        template: true,
        student: true,
        issuedBy: true
      }
    });

    return documents.map((document) => ({
      titulo: document.title,
      tipo: this.getDocumentTypeLabel(document.documentType),
      plantilla: document.template?.name || 'Sin plantilla',
      estudiante: document.student ? `${document.student.firstName} ${document.student.lastName}`.trim() : 'Sin estudiante',
      emitido_por: document.issuedBy ? `${document.issuedBy.firstName} ${document.issuedBy.lastName}`.trim() : 'Sistema',
      archivo: document.fileUrl,
      fecha_emision: this.formatExportDate(document.createdAt)
    }));
  }

  private mapRows(items: unknown[], keys: string[]): ExportRow[] {
    return items.map((item) =>
      keys.reduce<ExportRow>((row, key) => {
        const value = (item as Record<string, unknown>)[key];
        row[key] =
          value instanceof Date ? value.toISOString() : Array.isArray(value) || typeof value === 'object'
            ? JSON.stringify(value)
            : value === undefined
              ? null
              : (value as string | number | boolean | null);
        return row;
      }, {})
    );
  }

  private withCycleFilter<T extends Record<string, unknown>>(base: T, filters: ExportFiltersDto): T {
    if (!filters.cycleId) {
      return base;
    }

    return {
      ...base,
      cycleId: filters.cycleId
    };
  }

  private withDateFilters<T extends Record<string, unknown>>(
    base: T,
    filters: ExportFiltersDto,
    field: string
  ): T {
    if (filters.from && filters.to) {
      return {
        ...base,
        [field]: Between(filters.from, filters.to)
      };
    }

    return base;
  }

  private withCreatedAtFilters<T extends Record<string, unknown>>(base: T, filters: ExportFiltersDto): T {
    if (filters.from && filters.to) {
      return {
        ...base,
        createdAt: Between(new Date(filters.from), new Date(`${filters.to}T23:59:59.999Z`))
      };
    }

    return base;
  }

  private escapeCsvValue(value: ExportRow[string]): string {
    if (value === null || value === undefined) {
      return '';
    }

    const normalized = String(value).replace(/"/g, '""');
    return /[,"\n]/.test(normalized) ? `"${normalized}"` : normalized;
  }

  private getRoleLabel(role: string): string {
    const normalizedRole = String(role);
    if (normalizedRole === 'school_admin') return 'Administrador escolar';
    if (normalizedRole === 'teacher') return 'Docente';
    if (normalizedRole === 'student') return 'Estudiante';
    if (normalizedRole === 'parent') return 'Padre o madre';
    if (normalizedRole === 'super_admin') return 'Administrador general';
    return normalizedRole;
  }

  private getEnrollmentStatusLabel(status: Enrollment['status']): string {
    switch (status) {
      case EnrollmentStatus.ACCEPTED:
        return 'Aceptada';
      case EnrollmentStatus.REJECTED:
        return 'Rechazada';
      case EnrollmentStatus.PENDING:
      default:
        return 'Pendiente';
    }
  }

  private getDocumentTypeLabel(type: IssuedDocument['documentType']): string {
    switch (type) {
      case DocumentType.CERTIFICATE:
        return 'Certificado';
      case DocumentType.CONSTANCY:
        return 'Constancia';
      case DocumentType.REPORT_CARD:
        return 'Libreta';
      case DocumentType.CUSTOM:
      default:
        return 'Documento';
    }
  }

  private formatExportDate(value: Date | string | null): string {
    if (!value) {
      return '-';
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private async loadLogoBuffer(logoUrl: string | null): Promise<Buffer | null> {
    if (!logoUrl) {
      return null;
    }

    try {
      if (/^https?:\/\//i.test(logoUrl)) {
        const response = await fetch(logoUrl);
        if (!response.ok) {
          return null;
        }

        return Buffer.from(new Uint8Array(await response.arrayBuffer()));
      }

      return await readFile(join(process.cwd(), logoUrl.replace(/^\//, '')));
    } catch {
      return null;
    }
  }

  private async buildStudentReportCardData(studentId: string, schoolId: string, cycleId: string) {
    const [student, school, schoolConfig, cycle, summaries] = await Promise.all([
      this.usersService.findById(studentId, schoolId),
      this.schoolsService.findById(schoolId),
      this.schoolConfigService.getConfig(schoolId),
      this.academicCyclesRepository.findOne({ where: { schoolId, id: cycleId } }),
      this.gradesService.getStudentSummaries(studentId, cycleId, schoolId)
    ]);

    if (!cycle) {
      throw new NotFoundException('Ciclo académico no encontrado');
    }

    const classIds = summaries.map((summary) => summary.classId);
    const classes =
      classIds.length > 0
        ? await this.classesRepository.find({
            where: { schoolId, id: In(classIds) }
          })
        : [];
    const classesById = new Map(classes.map((schoolClass) => [schoolClass.id, schoolClass]));
    const logoBuffer = await this.loadLogoBuffer(schoolConfig.logoUrl);

    const courseRows = summaries.map((summary) => {
      const schoolClass = classesById.get(summary.classId);
      const studentSummary = summary.students[0];

      return {
        classLabel: schoolClass?.displayName || schoolClass?.name || 'Curso sin nombre',
        examsAverage: studentSummary?.examsAverage ?? 0,
        participationsAverage: studentSummary?.participationsAverage ?? 0,
        tasksAverage: studentSummary?.tasksAverage ?? 0,
        finalScore: studentSummary?.finalScore ?? 0,
        finalScaledScore: studentSummary?.finalScaledScore ?? '-',
        attendanceLabel: `${studentSummary?.attendedRecords ?? 0}/${studentSummary?.totalAttendanceRecords ?? 0} (${studentSummary?.attendancePercentage ?? 0}%)`,
        attendancePercentage: studentSummary?.attendancePercentage ?? 0,
        status: studentSummary?.status ?? 'failed',
        config: summary.config
      };
    });

    const averageFinal =
      courseRows.length > 0
        ? Number((courseRows.reduce((sum, row) => sum + row.finalScore, 0) / courseRows.length).toFixed(2))
        : 0;
    const averageAttendance =
      courseRows.length > 0
        ? Number((courseRows.reduce((sum, row) => sum + row.attendancePercentage, 0) / courseRows.length).toFixed(2))
        : 0;
    const approvedCourses = courseRows.filter((row) => row.status === 'passed').length;

    return {
      schoolName: school.name,
      logoBuffer,
      principalName: schoolConfig.principalName,
      studentName: `${student.firstName} ${student.lastName}`,
      studentEmail: student.email,
      cycleLabel: cycle.name,
      generatedAt: new Date(),
      courseRows,
      approvedCourses,
      averageFinal,
      averageAttendance
    };
  }

  private renderStudentReportCardPdfBuffer(input: {
    schoolName: string;
    logoBuffer: Buffer | null;
    principalName: string | null;
    studentName: string;
    studentEmail: string;
    cycleLabel: string;
    generatedAt: Date;
    courseRows: Array<{
      classLabel: string;
      examsAverage: number;
      participationsAverage: number;
      tasksAverage: number;
      finalScore: number;
      finalScaledScore: string;
      attendanceLabel: string;
      attendancePercentage: number;
      status: 'passed' | 'failed' | 'failed_attendance' | 'failed_both';
      config: Awaited<ReturnType<GradesService['getClassSummary']>>['config'];
    }>;
    approvedCourses: number;
    averageFinal: number;
    averageAttendance: number;
  }): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0
      });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer | Uint8Array) =>
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      );
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.renderStudentReportCardPdf(doc, input);
      doc.end();
    });
  }

  private renderGradesControlPdf(
    doc: PdfDocumentInstance,
    input: {
      schoolName: string;
      logoBuffer: Buffer | null;
      principalName: string | null;
      classLabel: string;
      cycleLabel: string;
      gradeLabel: string;
      generatedAt: Date;
      summary: Awaited<ReturnType<GradesService['getClassSummary']>>;
    }
  ) {
    const left = 40;
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const usableWidth = pageWidth - 80;
    const brand = '#1c7ed6';
    const slate = '#475569';
    const muted = '#64748b';
    const border = '#dbe4f0';
    const soft = '#f8fafc';

    doc.rect(0, 0, pageWidth, 108).fill(brand);
    doc.fillColor('#ffffff');

    if (input.logoBuffer) {
      try {
        doc.roundedRect(left, 22, 56, 56, 16).fill('#ffffff');
        doc.image(input.logoBuffer, left + 6, 28, { fit: [44, 44], align: 'center', valign: 'center' });
      } catch {
        doc.fillColor('#ffffff');
      }
    }

    const headerX = input.logoBuffer ? left + 72 : left;
    doc.fontSize(24).font('Helvetica-Bold').text(input.schoolName, headerX, 24, {
      width: usableWidth - (headerX - left) - 12
    });
    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#dbeafe')
      .text('Control de notas institucional', headerX, 56);

    if (input.principalName) {
      doc
        .fontSize(9)
        .fillColor('#e0ecff')
        .text(`Dirección: ${input.principalName}`, headerX, 74, { width: usableWidth - (headerX - left) });
    }

    let y = 132;
    doc.fillColor('#0f172a');
    const gap = 14;
    const cardWidth = (usableWidth - gap) / 2;
    const cardHeight = 74;
    const infoCards = [
      { title: 'Clase', value: input.classLabel, x: left, y },
      { title: 'Ciclo', value: input.cycleLabel, x: left + cardWidth + gap, y },
      { title: 'Grado', value: input.gradeLabel, x: left, y: y + cardHeight + gap },
      {
        title: 'Fecha de emisión',
        value: input.generatedAt.toLocaleDateString('es-PE'),
        x: left + cardWidth + gap,
        y: y + cardHeight + gap
      }
    ];

    infoCards.forEach((card) => {
      doc.roundedRect(card.x, card.y, cardWidth, cardHeight, 14).fillAndStroke(soft, border);
      doc.fillColor(muted).fontSize(10).font('Helvetica-Bold').text(card.title, card.x + 16, card.y + 14);
      doc
        .fillColor('#0f172a')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(card.value, card.x + 16, card.y + 32, { width: cardWidth - 32 });
    });

    y += cardHeight * 2 + gap + 26;
    const config = input.summary.config;
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('Esquema de evaluación', left, y);
    y += 20;
    doc.roundedRect(left, y, usableWidth, 42, 12).fillAndStroke('#f8fafc', border);
    doc
      .fillColor(slate)
      .fontSize(10)
      .font('Helvetica')
      .text(
        `Exámenes ${config.examsWeight}%  |  Participaciones ${config.participationsWeight}%  |  Tareas ${config.tasksWeight}%  |  Nota mínima ${config.passingScore}  |  Asistencia mínima ${config.minimumAttendancePercentage}%`,
        left + 16,
        y + 15,
        { width: usableWidth - 32, align: 'center' }
      );
    y += 56;

    const columns = [
      { label: 'Alumno', width: 148 },
      { label: 'Exám.', width: 42 },
      { label: 'Part.', width: 42 },
      { label: 'Tareas', width: 48 },
      { label: 'Final', width: 46 },
      { label: 'Escala', width: 50 },
      { label: 'Asistencia', width: 72 },
      { label: 'Estado', width: 58 }
    ];

    const drawTableHeader = () => {
      doc.roundedRect(left, y, usableWidth, 28, 10).fill('#dbe7f7');
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9);
      let x = left + 10;
      for (const column of columns) {
        doc.text(column.label, x, y + 9, { width: column.width - 8 });
        x += column.width;
      }
      y += 36;
    };

    const ensureSpace = (rowHeight = 24) => {
      if (y + rowHeight > pageHeight - 70) {
        doc.addPage();
        y = 40;
        drawTableHeader();
      }
    };

    drawTableHeader();

    if (input.summary.students.length === 0) {
      ensureSpace(64);
      doc.roundedRect(left, y - 2, usableWidth, 56, 12).fillAndStroke(soft, border);
      doc.fillColor(muted).font('Helvetica').fontSize(11).text(
        'No hay estudiantes con información suficiente para este control de notas.',
        left + 18,
        y + 18,
        { width: usableWidth - 36, align: 'center' }
      );
      y += 68;
    } else {
      input.summary.students.forEach((student, index) => {
        ensureSpace(26);

        if (index % 2 === 0) {
          doc.roundedRect(left, y - 4, usableWidth, 24, 8).fill('#f8fafc');
        }

        doc.fillColor('#0f172a').font('Helvetica').fontSize(9);
        const statusLabel =
          student.status === 'passed'
            ? 'Aprobado'
            : student.status === 'failed_attendance'
              ? 'Por asistencia'
              : student.status === 'failed_both'
                ? 'Nota y asistencia'
                : 'Por nota';
        const values = [
          `${student.firstName} ${student.lastName}`,
          student.examsAverage.toFixed(2),
          student.participationsAverage.toFixed(2),
          student.tasksAverage.toFixed(2),
          student.finalScore.toFixed(2),
          student.finalScaledScore,
          `${student.attendedRecords}/${student.totalAttendanceRecords} (${student.attendancePercentage}%)`,
          statusLabel
        ];

        let x = left + 10;
        values.forEach((value, valueIndex) => {
          doc.text(value, x, y, { width: columns[valueIndex].width - 8 });
          x += columns[valueIndex].width;
        });

        y += 24;
      });
    }

    y += 14;
    ensureSpace(66);

    const approved = input.summary.students.filter((student) => student.status === 'passed').length;
    const failed = input.summary.students.length - approved;
    doc.roundedRect(left, y, usableWidth, 74, 16).fillAndStroke('#eff6ff', '#d5e5fb');
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text('Cierre del control', left + 18, y + 14);
    const statWidth = (usableWidth - 36) / 4;
    const stats = [
      `Estudiantes: ${input.summary.students.length}`,
      `Aprobados: ${approved}`,
      `Desaprobados: ${failed}`,
      `Curso cerrado: ${config.isClosed ? 'Sí' : 'No'}`
    ];

    doc.font('Helvetica').fontSize(10).fillColor(slate);
    stats.forEach((label, index) => {
      doc.text(label, left + 18 + statWidth * index, y + 38, {
        width: statWidth - 12,
        align: index === 3 ? 'right' : 'left'
      });
    });

    const footerText: string = this.pdfGeneratorService.renderTemplate('Generado por {{school}}', {
      school: input.schoolName
    });
    doc.fontSize(8).fillColor('#64748b').text(footerText, left, pageHeight - 28, { width: usableWidth, align: 'center' });
  }

  private renderStudentReportCardPdf(
    doc: PdfDocumentInstance,
    input: {
      schoolName: string;
      logoBuffer: Buffer | null;
      principalName: string | null;
      studentName: string;
      studentEmail: string;
      cycleLabel: string;
      generatedAt: Date;
      courseRows: Array<{
        classLabel: string;
        examsAverage: number;
        participationsAverage: number;
        tasksAverage: number;
        finalScore: number;
        finalScaledScore: string;
        attendanceLabel: string;
        attendancePercentage: number;
        status: 'passed' | 'failed' | 'failed_attendance' | 'failed_both';
        config: Awaited<ReturnType<GradesService['getClassSummary']>>['config'];
      }>;
      approvedCourses: number;
      averageFinal: number;
      averageAttendance: number;
    }
  ) {
    const left = 40;
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const usableWidth = pageWidth - 80;
    const brand = '#1c7ed6';
    const slate = '#475569';
    const muted = '#64748b';
    const border = '#dbe4f0';
    const soft = '#f8fafc';

    doc.rect(0, 0, pageWidth, 108).fill(brand);
    doc.fillColor('#ffffff');

    if (input.logoBuffer) {
      try {
        doc.roundedRect(left, 22, 56, 56, 16).fill('#ffffff');
        doc.image(input.logoBuffer, left + 6, 28, { fit: [44, 44], align: 'center', valign: 'center' });
      } catch {
        doc.fillColor('#ffffff');
      }
    }

    const headerX = input.logoBuffer ? left + 72 : left;
    doc.fontSize(24).font('Helvetica-Bold').text(input.schoolName, headerX, 24, {
      width: usableWidth - (headerX - left) - 12
    });
    doc.fontSize(11).font('Helvetica').fillColor('#dbeafe').text('Libreta individual del estudiante', headerX, 56);
    if (input.principalName) {
      doc.fontSize(9).fillColor('#e0ecff').text(`Dirección: ${input.principalName}`, headerX, 74);
    }

    let y = 132;
    doc.roundedRect(left, y, usableWidth, 86, 18).fillAndStroke(soft, border);
    doc.fillColor(muted).fontSize(10).font('Helvetica-Bold').text('Estudiante', left + 18, y + 16);
    doc.fillColor('#0f172a').fontSize(18).font('Helvetica-Bold').text(input.studentName, left + 18, y + 34, {
      width: 260
    });
    doc.fillColor(slate).fontSize(10).font('Helvetica').text(input.studentEmail, left + 18, y + 58, { width: 260 });

    doc.fillColor(muted).fontSize(10).font('Helvetica-Bold').text('Ciclo', left + 330, y + 16);
    doc.fillColor('#0f172a').fontSize(15).font('Helvetica-Bold').text(input.cycleLabel, left + 330, y + 34, {
      width: 180
    });
    doc.fillColor(muted).fontSize(10).font('Helvetica-Bold').text('Fecha de emisión', left + 330, y + 58);
    doc.fillColor('#0f172a').fontSize(11).font('Helvetica').text(input.generatedAt.toLocaleDateString('es-PE'), left + 440, y + 58);

    y += 106;
    const gap = 12;
    const statWidth = (usableWidth - gap * 2) / 3;
    const statCards = [
      { title: 'Promedio general', value: input.averageFinal.toFixed(2) },
      { title: 'Asistencia promedio', value: `${input.averageAttendance.toFixed(2)}%` },
      { title: 'Cursos aprobados', value: `${input.approvedCourses}/${input.courseRows.length}` }
    ];

    statCards.forEach((card, index) => {
      const x = left + index * (statWidth + gap);
      doc.roundedRect(x, y, statWidth, 62, 14).fillAndStroke('#eff6ff', '#d5e5fb');
      doc.fillColor(muted).fontSize(9).font('Helvetica-Bold').text(card.title, x + 14, y + 14);
      doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text(card.value, x + 14, y + 32, {
        width: statWidth - 28,
        align: 'center'
      });
    });

    y += 84;
    const columns = [
      { label: 'Curso', width: 156 },
      { label: 'Exám.', width: 42 },
      { label: 'Part.', width: 42 },
      { label: 'Tareas', width: 50 },
      { label: 'Final', width: 48 },
      { label: 'Escala', width: 50 },
      { label: 'Asistencia', width: 72 },
      { label: 'Estado', width: 52 }
    ];

    const drawHeader = () => {
      doc.roundedRect(left, y, usableWidth, 28, 10).fill('#dbe7f7');
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9);
      let x = left + 10;
      for (const column of columns) {
        doc.text(column.label, x, y + 9, { width: column.width - 8 });
        x += column.width;
      }
      y += 36;
    };

    const ensureSpace = (rowHeight = 24) => {
      if (y + rowHeight > pageHeight - 82) {
        doc.addPage();
        y = 44;
        drawHeader();
      }
    };

    drawHeader();

    if (input.courseRows.length === 0) {
      ensureSpace(64);
      doc.roundedRect(left, y - 2, usableWidth, 56, 12).fillAndStroke(soft, border);
      doc.fillColor(slate).font('Helvetica').fontSize(11).text(
        'No hay cursos con información suficiente para esta libreta.',
        left + 18,
        y + 18,
        { width: usableWidth - 36, align: 'center' }
      );
      y += 68;
    } else {
      input.courseRows.forEach((row, index) => {
        ensureSpace(26);
        if (index % 2 === 0) {
          doc.roundedRect(left, y - 4, usableWidth, 24, 8).fill('#f8fafc');
        }

        const statusLabel =
          row.status === 'passed'
            ? 'Aprobado'
            : row.status === 'failed_attendance'
              ? 'Asistencia'
              : row.status === 'failed_both'
                ? 'Ambos'
                : 'Nota';
        const values = [
          row.classLabel,
          row.examsAverage.toFixed(2),
          row.participationsAverage.toFixed(2),
          row.tasksAverage.toFixed(2),
          row.finalScore.toFixed(2),
          row.finalScaledScore,
          row.attendanceLabel,
          statusLabel
        ];

        doc.fillColor('#0f172a').font('Helvetica').fontSize(9);
        let x = left + 10;
        values.forEach((value, valueIndex) => {
          doc.text(value, x, y, { width: columns[valueIndex].width - 8 });
          x += columns[valueIndex].width;
        });
        y += 24;
      });
    }

    y += 14;
    ensureSpace(64);
    const footerConfig = input.courseRows[0]?.config;
    if (footerConfig) {
      doc.roundedRect(left, y, usableWidth, 56, 16).fillAndStroke('#f8fafc', border);
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text('Criterios del ciclo', left + 18, y + 14);
      doc
        .fillColor(slate)
        .font('Helvetica')
        .fontSize(10)
        .text(
          `Exámenes ${footerConfig.examsWeight}%  |  Participaciones ${footerConfig.participationsWeight}%  |  Tareas ${footerConfig.tasksWeight}%  |  Nota mínima ${footerConfig.passingScore}  |  Asistencia mínima ${footerConfig.minimumAttendancePercentage}%`,
          left + 18,
          y + 32,
          { width: usableWidth - 36, align: 'center' }
        );
    }

    const footerText: string = this.pdfGeneratorService.renderTemplate('Generado por {{school}}', {
      school: input.schoolName
    });
    doc.fontSize(8).fillColor('#64748b').text(footerText, left, pageHeight - 28, { width: usableWidth, align: 'center' });
  }
}
