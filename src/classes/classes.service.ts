import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { AcademicCyclesService } from '../academic-cycles/academic-cycles.service';
import { Enrollment, EnrollmentStatus } from '../enrollment/entities/enrollment.entity';
import { PaginatedResultDto } from '../common/dto/paginated-result.dto';
import { Role } from '../common/enums/role.enum';
import { paginate } from '../common/helpers/paginate.helper';
import { UsersService } from '../users/users.service';
import { AssignTeacherDto } from './dto/assign-teacher.dto';
import { ClassFiltersDto } from './dto/class-filters.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { SetScheduleDto } from './dto/set-schedule.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { SchoolClass } from './entities/class.entity';
import { Schedule } from './entities/schedule.entity';
import { SchedulesRepository, SchoolClassesRepository } from './repositories';

@Injectable()
export class ClassesService {
  constructor(
    private readonly classesRepository: SchoolClassesRepository,
    private readonly schedulesRepository: SchedulesRepository,
    @Inject(forwardRef(() => AcademicCyclesService))
    private readonly academicCyclesService: AcademicCyclesService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService
  ) {}

  async createClass(dto: CreateClassDto, schoolId: string): Promise<SchoolClass> {
    const structure = await this.validateStructure(dto.cycleId, dto.gradeId, dto.sectionId, schoolId);
    const course = await this.academicCyclesService.findCourseById(dto.courseId, schoolId);

    const generatedName = dto.name?.trim() || `${structure.grade.name} ${structure.section.name} - ${course.name}`;
    const schoolClass = this.classesRepository.create({
      schoolId,
      cycleId: dto.cycleId,
      gradeId: dto.gradeId,
      sectionId: dto.sectionId,
      courseId: dto.courseId,
      name: generatedName,
      subject: dto.subject?.trim() || course.name,
      displayName: dto.displayName?.trim() || null,
      teacherId: null,
      isActive: true
    });
    const savedClass = await this.classesRepository.save(schoolClass);
    await this.syncEnrolledStudentsToClass(savedClass, schoolId);
    return savedClass;
  }

  async findAll(filters: ClassFiltersDto, schoolId: string): Promise<PaginatedResultDto<SchoolClass>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const query = this.classesRepository
      .createQueryBuilder('class')
      .where('class.schoolId = :schoolId', { schoolId })
      .orderBy('class.createdAt', 'DESC');

    if (filters.cycleId) query.andWhere('class.cycleId = :cycleId', { cycleId: filters.cycleId });
    if (filters.gradeId) query.andWhere('class.gradeId = :gradeId', { gradeId: filters.gradeId });
    if (filters.sectionId) query.andWhere('class.sectionId = :sectionId', { sectionId: filters.sectionId });
    if (filters.courseId) query.andWhere('class.courseId = :courseId', { courseId: filters.courseId });
    if (filters.search) {
      query.andWhere('(LOWER(class.name) LIKE :search OR LOWER(class.subject) LIKE :search OR LOWER(class.displayName) LIKE :search)', {
        search: `%${filters.search.toLowerCase()}%`
      });
    }

    query.skip((page - 1) * limit).take(limit);
    const [data, total] = await query.getManyAndCount();
    return paginate(data, total, page, limit);
  }

  async findTeacherClasses(teacherId: string, schoolId: string): Promise<SchoolClass[]> {
    return this.classesRepository.find({
      where: { schoolId, teacherId },
      order: { createdAt: 'DESC' }
    });
  }

  async findStudentClasses(studentId: string, schoolId: string): Promise<SchoolClass[]> {
    await this.usersService.findById(studentId, schoolId);
    await this.usersService.ensureUserHasRoleInSchool(studentId, schoolId, [Role.STUDENT]);

    const assignedClasses = await this.classesRepository
      .createQueryBuilder('class')
      .innerJoin('student_class_assignments', 'assignment', 'assignment.classId = class.id')
      .where('class.schoolId = :schoolId', { schoolId })
      .andWhere('assignment.schoolId = :schoolId', { schoolId })
      .andWhere('assignment.studentId = :studentId', { studentId })
      .orderBy('class.createdAt', 'DESC')
      .getMany();

    const enrollmentsRepository = this.classesRepository.manager.getRepository(Enrollment);
    const acceptedEnrollments = await enrollmentsRepository.find({
      where: {
        schoolId,
        studentUserId: studentId,
        status: EnrollmentStatus.ACCEPTED
      }
    });

    const syncedClasses: SchoolClass[] = [];

    for (const enrollment of acceptedEnrollments) {
      if (!enrollment.sectionId) {
        continue;
      }

      const classes = await this.classesRepository.find({
        where: {
          schoolId,
          cycleId: enrollment.cycleId,
          sectionId: enrollment.sectionId
        },
        order: { createdAt: 'DESC' }
      });

      for (const schoolClass of classes) {
        await this.usersService.assignStudentToClass(studentId, schoolClass.id, schoolId);
        syncedClasses.push(schoolClass);
      }
    }

    const merged = new Map<string, SchoolClass>();
    for (const schoolClass of [...assignedClasses, ...syncedClasses]) {
      merged.set(schoolClass.id, schoolClass);
    }

    return [...merged.values()].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  }

  async findParentClasses(parentId: string, schoolId: string): Promise<SchoolClass[]> {
    const linkedStudents = await this.usersService.getLinkedStudentsForParent(parentId, schoolId);
    const classIds = [...new Set(linkedStudents.flatMap((student) => student.classIds))];

    if (classIds.length === 0) {
      return [];
    }

    return this.classesRepository
      .createQueryBuilder('class')
      .where('class.schoolId = :schoolId', { schoolId })
      .andWhere('class.id IN (:...classIds)', { classIds })
      .orderBy('class.createdAt', 'DESC')
      .getMany();
  }

  async findById(id: string, schoolId: string): Promise<SchoolClass> {
    const schoolClass = await this.classesRepository.findOne({ where: { id, schoolId } });
    if (!schoolClass) {
      throw new NotFoundException('Clase no encontrada');
    }
    return schoolClass;
  }

  async updateClass(id: string, dto: UpdateClassDto, schoolId: string): Promise<SchoolClass> {
    const schoolClass = await this.findById(id, schoolId);
    const structure = await this.validateStructure(
      dto.cycleId ?? schoolClass.cycleId,
      dto.gradeId ?? schoolClass.gradeId,
      dto.sectionId ?? schoolClass.sectionId,
      schoolId
    );
    let nextCourseId = dto.courseId ?? schoolClass.courseId;
    let linkedCourse = nextCourseId ? await this.academicCyclesService.findCourseById(nextCourseId, schoolId) : null;

    Object.assign(schoolClass, dto, { courseId: nextCourseId });

    if (dto.subject !== undefined) {
      schoolClass.subject = dto.subject;
    } else if (linkedCourse && !schoolClass.subject) {
      schoolClass.subject = linkedCourse.name;
    }

    if (dto.name !== undefined) {
      schoolClass.name = dto.name;
    } else if (linkedCourse && (dto.gradeId || dto.sectionId || dto.courseId)) {
      schoolClass.name = `${structure.grade.name} ${structure.section.name} - ${linkedCourse.name}`;
    }

    return this.classesRepository.save(schoolClass);
  }

  async assignTeacher(classId: string, dto: AssignTeacherDto, schoolId: string): Promise<void> {
    const schoolClass = await this.findById(classId, schoolId);
    await this.usersService.findById(dto.teacherId, schoolId);
    await this.usersService.ensureUserHasRoleInSchool(dto.teacherId, schoolId, [Role.TEACHER]);

    schoolClass.teacherId = dto.teacherId;
    await this.classesRepository.save(schoolClass);
  }

  async setSchedule(classId: string, dto: SetScheduleDto, schoolId: string): Promise<Schedule> {
    await this.findById(classId, schoolId);
    this.ensureScheduleRangeIsValid(dto.startTime, dto.endTime);
    await this.ensureScheduleDoesNotOverlap(classId, dto, schoolId);
    const schedule = this.schedulesRepository.create({
      schoolId,
      classId,
      dayOfWeek: dto.dayOfWeek,
      startTime: dto.startTime,
      endTime: dto.endTime,
      room: dto.room ?? null
    });
    return this.schedulesRepository.save(schedule);
  }

  async getClassSchedules(classId: string, schoolId: string): Promise<Schedule[]> {
    await this.findById(classId, schoolId);
    return this.schedulesRepository.find({
      where: { classId, schoolId },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' }
    });
  }

  async getTeacherSchedule(teacherId: string, schoolId: string): Promise<Schedule[]> {
    await this.usersService.findById(teacherId, schoolId);
    await this.usersService.ensureUserHasRoleInSchool(teacherId, schoolId, [Role.TEACHER]);

    return this.schedulesRepository
      .createQueryBuilder('schedule')
      .innerJoin(SchoolClass, 'class', 'class.id = schedule.classId')
      .where('schedule.schoolId = :schoolId', { schoolId })
      .andWhere('class.teacherId = :teacherId', { teacherId })
      .orderBy('schedule.dayOfWeek', 'ASC')
      .addOrderBy('schedule.startTime', 'ASC')
      .getMany();
  }

  async teacherOwnsClass(classId: string, teacherId: string, schoolId: string): Promise<boolean> {
    const schoolClass = await this.classesRepository.findOne({
      where: { id: classId, schoolId, teacherId }
    });
    return Boolean(schoolClass);
  }

  async studentHasClassAccess(classId: string, studentId: string, schoolId: string): Promise<boolean> {
    const assignment = await this.classesRepository
      .createQueryBuilder('class')
      .innerJoin('student_class_assignments', 'assignment', 'assignment.classId = class.id')
      .where('class.id = :classId', { classId })
      .andWhere('class.schoolId = :schoolId', { schoolId })
      .andWhere('assignment.schoolId = :schoolId', { schoolId })
      .andWhere('assignment.studentId = :studentId', { studentId })
      .getOne();

    return Boolean(assignment);
  }

  async updateSchedule(scheduleId: string, dto: UpdateScheduleDto, schoolId: string): Promise<Schedule> {
    const schedule = await this.findScheduleById(scheduleId, schoolId);
    this.ensureScheduleRangeIsValid(dto.startTime, dto.endTime);
    await this.ensureScheduleDoesNotOverlap(schedule.classId, dto, schoolId, schedule.id);

    Object.assign(schedule, {
      dayOfWeek: dto.dayOfWeek,
      startTime: dto.startTime,
      endTime: dto.endTime,
      room: dto.room ?? null
    });

    return this.schedulesRepository.save(schedule);
  }

  async deleteSchedule(scheduleId: string, schoolId: string): Promise<void> {
    const schedule = await this.findScheduleById(scheduleId, schoolId);
    await this.schedulesRepository.remove(schedule);
  }

  private async validateStructure(
    cycleId: string,
    gradeId: string,
    sectionId: string,
    schoolId: string
  ): Promise<{ cycle: Awaited<ReturnType<AcademicCyclesService['findById']>>; grade: Awaited<ReturnType<AcademicCyclesService['findGradeById']>>; section: Awaited<ReturnType<AcademicCyclesService['findSectionById']>> }> {
    await this.academicCyclesService.findById(cycleId, schoolId);
    const grade = await this.academicCyclesService.findGradeById(gradeId, schoolId);
    const section = await this.academicCyclesService.findSectionById(sectionId, schoolId);

    if (section.gradeId !== gradeId) {
      throw new ConflictException('La sección no pertenece al grado indicado');
    }

    if (section.cycleId !== cycleId) {
      throw new ConflictException('La sección no pertenece al ciclo indicado');
    }

    const cycle = await this.academicCyclesService.findById(cycleId, schoolId);
    return { cycle, grade, section };
  }

  private async findScheduleById(scheduleId: string, schoolId: string): Promise<Schedule> {
    const schedule = await this.schedulesRepository.findOne({
      where: { id: scheduleId, schoolId }
    });

    if (!schedule) {
      throw new NotFoundException('Horario no encontrado');
    }

    return schedule;
  }

  private async ensureScheduleDoesNotOverlap(
    classId: string,
    dto: SetScheduleDto,
    schoolId: string,
    ignoredScheduleId?: string
  ): Promise<void> {
    const schedules = await this.schedulesRepository.find({
      where: { classId, schoolId, dayOfWeek: dto.dayOfWeek }
    });

    const overlaps = schedules.some((schedule) => {
      if (ignoredScheduleId && schedule.id === ignoredScheduleId) {
        return false;
      }
      return dto.startTime < schedule.endTime && dto.endTime > schedule.startTime;
    });

    if (overlaps) {
      throw new ConflictException('Ya existe un horario superpuesto para esta clase en ese día');
    }
  }

  private ensureScheduleRangeIsValid(startTime: string, endTime: string): void {
    if (startTime >= endTime) {
      throw new BadRequestException('La hora de fin debe ser mayor que la hora de inicio');
    }
  }

  private async syncEnrolledStudentsToClass(schoolClass: SchoolClass, schoolId: string): Promise<void> {
    const enrollmentsRepository = this.classesRepository.manager.getRepository(Enrollment);
    const acceptedEnrollments = await enrollmentsRepository.find({
      where: {
        schoolId,
        cycleId: schoolClass.cycleId,
        sectionId: schoolClass.sectionId,
        status: EnrollmentStatus.ACCEPTED
      }
    });

    for (const enrollment of acceptedEnrollments) {
      if (!enrollment.studentUserId) {
        continue;
      }

      await this.usersService.assignStudentToClass(enrollment.studentUserId, schoolClass.id, schoolId);
    }
  }
}
