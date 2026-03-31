import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { AcademicCyclesService } from '../academic-cycles/academic-cycles.service';
import { AttendanceStatus } from '../attendance/entities/attendance-record.entity';
import { ClassesService } from '../classes/classes.service';
import { GradeScale } from '../school-config/entities/school-config.entity';
import { SchoolConfigService } from '../school-config/school-config.service';
import { UsersService } from '../users/users.service';
import { GradeClassSummaryDto, GradeSummaryConfigDto, ParentGradeSummaryDto } from './dto/grade-summary.dto';
import { RegisterGradeDto } from './dto/register-grade.dto';
import { UpdateClassGradeConfigDto } from './dto/update-class-grade-config.dto';
import { ClassGradeConfig } from './entities/class-grade-config.entity';
import { GradeRecord } from './entities/grade-record.entity';
import {
  ClassGradeConfigsRepository,
  GradeAttendanceRecordsRepository,
  GradeParentLinksRepository,
  GradeRecordsRepository,
  GradeTaskGradesRepository,
  GradeTasksRepository,
  GradeUsersRepository
} from './repositories';

@Injectable()
export class GradesService {
  constructor(
    private readonly gradesRepository: GradeRecordsRepository,
    private readonly parentStudentLinksRepository: GradeParentLinksRepository,
    private readonly classGradeConfigsRepository: ClassGradeConfigsRepository,
    private readonly gradeAttendanceRecordsRepository: GradeAttendanceRecordsRepository,
    private readonly gradeTasksRepository: GradeTasksRepository,
    private readonly gradeTaskGradesRepository: GradeTaskGradesRepository,
    private readonly gradeUsersRepository: GradeUsersRepository,
    private readonly classesService: ClassesService,
    private readonly usersService: UsersService,
    private readonly schoolConfigService: SchoolConfigService,
    private readonly academicCyclesService: AcademicCyclesService
  ) {}

  async registerGrade(dto: RegisterGradeDto, schoolId: string): Promise<GradeRecord> {
    await this.classesService.findById(dto.classId, schoolId);
    await this.usersService.findById(dto.studentId, schoolId);
    await this.academicCyclesService.findById(dto.cycleId, schoolId);

    const existing = await this.gradesRepository.findOne({
      where: {
        schoolId,
        classId: dto.classId,
        studentId: dto.studentId,
        cycleId: dto.cycleId,
        evaluationName: dto.evaluationName
      }
    });

    if (existing?.isClosed) {
      throw new ConflictException('Las notas de esta evaluación ya están cerradas');
    }

    const scaledScore = await this.applyGradeScale(dto.rawScore, schoolId);

    const gradeRecord =
      existing ??
      this.gradesRepository.create({
        schoolId,
        classId: dto.classId,
        studentId: dto.studentId,
        cycleId: dto.cycleId,
        evaluationName: dto.evaluationName,
        isClosed: false,
        rawScore: dto.rawScore,
        scaledScore: String(scaledScore)
      });

    gradeRecord.rawScore = dto.rawScore;
    gradeRecord.scaledScore = String(scaledScore);

    return this.gradesRepository.save(gradeRecord);
  }

  async getByStudent(studentId: string, cycleId: string, schoolId: string): Promise<GradeRecord[]> {
    await this.usersService.findById(studentId, schoolId);
    return this.gradesRepository.find({
      where: { schoolId, studentId, cycleId },
      order: { createdAt: 'DESC' }
    });
  }

  async getByParent(parentId: string, schoolId: string): Promise<GradeRecord[]> {
    await this.usersService.findById(parentId, schoolId);
    await this.usersService.ensureUserCanAccessLinkedStudentsInSchool(parentId, schoolId);

    const links = await this.parentStudentLinksRepository.find({
      where: { schoolId, parentId }
    });

    if (links.length === 0) {
      return [];
    }

    const studentIds = links.map((link) => link.studentId);
    return this.gradesRepository
      .createQueryBuilder('grade')
      .where('grade.schoolId = :schoolId', { schoolId })
      .andWhere('grade.studentId IN (:...studentIds)', { studentIds })
      .orderBy('grade.createdAt', 'DESC')
      .getMany();
  }

  async getByClass(classId: string, schoolId: string): Promise<GradeRecord[]> {
    await this.classesService.findById(classId, schoolId);
    return this.gradesRepository.find({
      where: { schoolId, classId },
      order: { createdAt: 'DESC' }
    });
  }

  async closeGradesByPeriod(cycleId: string, schoolId: string): Promise<void> {
    await this.academicCyclesService.findById(cycleId, schoolId);
    const records = await this.gradesRepository.find({ where: { schoolId, cycleId } });
    for (const record of records) {
      record.isClosed = true;
    }
    await this.gradesRepository.save(records);
  }

  async applyGradeScale(rawScore: number, schoolId: string): Promise<string | number> {
    const config = await this.schoolConfigService.getConfig(schoolId);

    switch (config.gradingScale) {
      case GradeScale.NUMERIC_10:
        return Math.min(10, Number((rawScore / 2).toFixed(2)));
      case GradeScale.LITERAL:
        if (rawScore >= 18) return 'A';
        if (rawScore >= 15) return 'B';
        if (rawScore >= 12) return 'C';
        if (rawScore >= 10) return 'D';
        return 'F';
      case GradeScale.NUMERIC_20:
      default:
        return Number(rawScore.toFixed(2));
    }
  }

  async getOrCreateClassConfig(classId: string, schoolId: string): Promise<ClassGradeConfig> {
    const schoolClass = await this.classesService.findById(classId, schoolId);
    const existing = await this.classGradeConfigsRepository.findOne({
      where: { schoolId, classId }
    });

    if (existing) {
      return existing;
    }

    const config = this.classGradeConfigsRepository.create({
      schoolId,
      classId,
      cycleId: schoolClass.cycleId,
      examsWeight: 20,
      participationsWeight: 30,
      tasksWeight: 50,
      passingScore: 11,
      minimumAttendancePercentage: 70,
      isClosed: false
    });

    return this.classGradeConfigsRepository.save(config);
  }

  async updateClassConfig(classId: string, dto: UpdateClassGradeConfigDto, schoolId: string): Promise<ClassGradeConfig> {
    if (Number(dto.examsWeight) + Number(dto.participationsWeight) + Number(dto.tasksWeight) !== 100) {
      throw new BadRequestException('La suma de ponderaciones debe ser 100');
    }

    const config = await this.getOrCreateClassConfig(classId, schoolId);

    if (config.isClosed) {
      throw new ConflictException('La configuración ya fue cerrada para esta clase');
    }

    config.examsWeight = dto.examsWeight;
    config.participationsWeight = dto.participationsWeight;
    config.tasksWeight = dto.tasksWeight;
    config.passingScore = dto.passingScore;
    config.minimumAttendancePercentage = dto.minimumAttendancePercentage;

    return this.classGradeConfigsRepository.save(config);
  }

  async closeClassGrades(classId: string, schoolId: string): Promise<void> {
    const config = await this.getOrCreateClassConfig(classId, schoolId);
    config.isClosed = true;
    await this.classGradeConfigsRepository.save(config);
  }

  async reopenClassGrades(classId: string, schoolId: string): Promise<void> {
    const config = await this.getOrCreateClassConfig(classId, schoolId);
    config.isClosed = false;
    await this.classGradeConfigsRepository.save(config);
  }

  async isClassClosed(classId: string, schoolId: string): Promise<boolean> {
    const config = await this.getOrCreateClassConfig(classId, schoolId);
    return config.isClosed;
  }

  async getClassSummary(classId: string, schoolId: string): Promise<GradeClassSummaryDto> {
    const schoolClass = await this.classesService.findById(classId, schoolId);
    const [config, students, taskGrades, attendanceRecords] = await Promise.all([
      this.getOrCreateClassConfig(classId, schoolId),
      this.usersService.getStudentsByClass(classId, schoolId),
      this.gradeTaskGradesRepository
        .createQueryBuilder('grade')
        .innerJoinAndSelect('grade.task', 'task')
        .where('grade.schoolId = :schoolId', { schoolId })
        .andWhere('task.classId = :classId', { classId })
        .getMany(),
      this.gradeAttendanceRecordsRepository.find({
        where: { schoolId, classId }
      })
    ]);

    return {
      classId,
      cycleId: schoolClass.cycleId,
      config: this.mapConfig(config),
      students: await Promise.all(
        students.map((student) =>
          this.buildStudentSummary(
            student.id,
            student.firstName,
            student.lastName,
            student.email,
            taskGrades,
            attendanceRecords,
            config,
            schoolId
          )
        )
      )
    };
  }

  async getStudentSummaries(studentId: string, cycleId: string, schoolId: string): Promise<GradeClassSummaryDto[]> {
    const schoolClasses = (await this.classesService.findStudentClasses(studentId, schoolId)).filter((item) => item.cycleId === cycleId);
    return Promise.all(schoolClasses.map((schoolClass) => this.getClassSummaryForStudent(schoolClass.id, studentId, schoolId)));
  }

  async getParentSummaries(parentId: string, schoolId: string): Promise<ParentGradeSummaryDto[]> {
    await this.usersService.findById(parentId, schoolId);
    await this.usersService.ensureUserCanAccessLinkedStudentsInSchool(parentId, schoolId);
    const linkedStudents = await this.usersService.getLinkedStudentsForParent(parentId, schoolId);

    const summaries = await Promise.all(
      linkedStudents.flatMap((student) =>
        student.classIds.map((classId) => this.getClassSummaryForStudent(classId, student.id, schoolId))
      )
    );

    const studentMap = new Map(linkedStudents.map((item) => [item.id, item]));

    return summaries.map((summary) => {
      const student = studentMap.get(summary.students[0]?.studentId ?? '');
      return {
        ...summary,
        studentId: summary.students[0]?.studentId ?? '',
        studentFirstName: student?.firstName ?? '',
        studentLastName: student?.lastName ?? ''
      };
    });
  }

  private async getClassSummaryForStudent(classId: string, studentId: string, schoolId: string): Promise<GradeClassSummaryDto> {
    const schoolClass = await this.classesService.findById(classId, schoolId);
    const [config, student, taskGrades, attendanceRecords] = await Promise.all([
      this.getOrCreateClassConfig(classId, schoolId),
      this.gradeUsersRepository.findOneOrFail({ where: { id: studentId } }),
      this.gradeTaskGradesRepository
        .createQueryBuilder('grade')
        .innerJoinAndSelect('grade.task', 'task')
        .where('grade.schoolId = :schoolId', { schoolId })
        .andWhere('grade.studentId = :studentId', { studentId })
        .andWhere('task.classId = :classId', { classId })
        .getMany(),
      this.gradeAttendanceRecordsRepository.find({
        where: { schoolId, classId, studentId }
      })
    ]);

    return {
      classId,
      cycleId: schoolClass.cycleId,
      config: this.mapConfig(config),
      students: [
        await this.buildStudentSummary(
          student.id,
          student.firstName,
          student.lastName,
          student.email,
          taskGrades,
          attendanceRecords,
          config,
          schoolId
        )
      ]
    };
  }

  private async buildStudentSummary(
    studentId: string,
    firstName: string,
    lastName: string,
    email: string,
    taskGrades: Array<{
      studentId: string;
      rawScore: number;
      feedback?: string | null;
      gradedAt?: Date | null;
      createdAt?: Date;
      task: { id: string; title?: string; taskType: string; maxScore: number | null };
    }>,
    attendanceRecords: Array<{ studentId: string; status: AttendanceStatus }>,
    config: ClassGradeConfig,
    schoolId: string
  ) {
    const schoolConfig = await this.schoolConfigService.getConfig(schoolId);
    const scaleMax = this.getScaleMax(schoolConfig.gradingScale);
    const studentGrades = taskGrades.filter((grade) => grade.studentId === studentId);

    const examScores = studentGrades
      .filter((grade) => grade.task.taskType === 'exam')
      .map((grade) => this.normalizeScore(grade.rawScore, grade.task.maxScore, scaleMax));
    const participationScores = studentGrades
      .filter((grade) => grade.task.taskType === 'participation')
      .map((grade) => this.normalizeScore(grade.rawScore, grade.task.maxScore, scaleMax));
    const taskScores = studentGrades
      .filter((grade) => grade.task.taskType !== 'exam' && grade.task.taskType !== 'participation')
      .map((grade) => this.normalizeScore(grade.rawScore, grade.task.maxScore, scaleMax));
    const latestFeedbackEntry = [...studentGrades]
      .filter((grade) => grade.feedback && grade.feedback.trim().length > 0)
      .sort((left, right) => {
        const leftTime = new Date(left.gradedAt ?? left.createdAt ?? 0).getTime();
        const rightTime = new Date(right.gradedAt ?? right.createdAt ?? 0).getTime();
        return rightTime - leftTime;
      })[0];

    const examsAverage = this.computeAverage(examScores);
    const participationsAverage = this.computeAverage(participationScores);
    const tasksAverage = this.computeAverage(taskScores);
    const finalScore = Number(
      (
        examsAverage * (config.examsWeight / 100) +
        participationsAverage * (config.participationsWeight / 100) +
        tasksAverage * (config.tasksWeight / 100)
      ).toFixed(2)
    );
    const finalScaledScore = String(await this.applyGradeScale(finalScore, schoolId));
    const studentAttendance = attendanceRecords.filter((record) => record.studentId === studentId);
    const totalAttendanceRecords = studentAttendance.length;
    const attendedRecords = studentAttendance.filter(
      (record) => record.status === AttendanceStatus.PRESENT || record.status === AttendanceStatus.LATE
    ).length;
    const attendancePercentage =
      totalAttendanceRecords > 0 ? Number(((attendedRecords / totalAttendanceRecords) * 100).toFixed(2)) : 0;
    const passedByGrade = finalScore >= config.passingScore;
    const passedByAttendance = attendancePercentage >= config.minimumAttendancePercentage;

    return {
      studentId,
      firstName,
      lastName,
      email,
      examsAverage,
      participationsAverage,
      tasksAverage,
      finalScore,
      finalScaledScore,
      gradedActivities: studentGrades.length,
      latestFeedback: latestFeedbackEntry?.feedback?.trim() ?? null,
      latestFeedbackTaskTitle: latestFeedbackEntry?.task.title ?? null,
      attendedRecords,
      totalAttendanceRecords,
      attendancePercentage,
      status: passedByGrade
        ? passedByAttendance
          ? ('passed' as const)
          : ('failed_attendance' as const)
        : passedByAttendance
          ? ('failed' as const)
          : ('failed_both' as const)
    };
  }

  private mapConfig(config: ClassGradeConfig): GradeSummaryConfigDto {
    return {
      id: config.id,
      classId: config.classId,
      cycleId: config.cycleId,
      examsWeight: config.examsWeight,
      participationsWeight: config.participationsWeight,
      tasksWeight: config.tasksWeight,
      passingScore: config.passingScore,
      minimumAttendancePercentage: config.minimumAttendancePercentage,
      isClosed: config.isClosed
    };
  }

  private computeAverage(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }
    return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
  }

  private getScaleMax(scale: GradeScale): number {
    if (scale === GradeScale.NUMERIC_10) {
      return 10;
    }
    return 20;
  }

  private normalizeScore(rawScore: number, maxScore: number | null, scaleMax: number): number {
    if (!maxScore || maxScore <= 0) {
      return Number(Math.min(scaleMax, rawScore).toFixed(2));
    }

    return Number(((rawScore / maxScore) * scaleMax).toFixed(2));
  }
}
