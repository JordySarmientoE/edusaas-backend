import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AcademicCyclesService } from '../academic-cycles/academic-cycles.service';
import { SchoolClass } from '../classes/entities/class.entity';
import { PaginatedResultDto } from '../common/dto/paginated-result.dto';
import { Role } from '../common/enums/role.enum';
import { paginate } from '../common/helpers/paginate.helper';
import { UsersService } from '../users/users.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { EnrollmentFiltersDto } from './dto/enrollment-filters.dto';
import { Enrollment, EnrollmentStatus } from './entities/enrollment.entity';
import { EnrollmentsRepository } from './repositories';

@Injectable()
export class EnrollmentService {
  constructor(
    private readonly enrollmentRepository: EnrollmentsRepository,
    private readonly usersService: UsersService,
    private readonly academicCyclesService: AcademicCyclesService
  ) {}

  async createEnrollment(dto: CreateEnrollmentDto, schoolId: string): Promise<Enrollment> {
    await this.academicCyclesService.findById(dto.cycleId, schoolId);
    const { section, grade } = await this.academicCyclesService.findSectionStructure(dto.sectionId, schoolId);

    if (section.cycleId !== dto.cycleId) {
      throw new ConflictException('La sección seleccionada no pertenece al ciclo indicado');
    }

    if (!section.isActive) {
      throw new ConflictException('La sección seleccionada está inactiva');
    }

    if (!grade.isActive) {
      throw new ConflictException('El grado de la sección seleccionada está inactivo');
    }

    const studentMembership = await this.usersService.findActiveMembershipByEmailInSchool(dto.email, schoolId, Role.STUDENT);

    if (!studentMembership?.user) {
      throw new ConflictException('Solo puedes matricular correos con acceso activo de estudiante en este colegio');
    }

    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: {
        schoolId,
        cycleId: dto.cycleId,
        studentUserId: studentMembership.userId
      }
    });

    if (existingEnrollment) {
      throw new ConflictException('Ese estudiante ya tiene una matrícula registrada para el ciclo seleccionado');
    }

    const enrollment = this.enrollmentRepository.create({
      schoolId,
      cycleId: dto.cycleId,
      sectionId: dto.sectionId,
      firstName: studentMembership.user.firstName,
      lastName: studentMembership.user.lastName,
      email: studentMembership.user.email,
      phoneNumber: studentMembership.user.phoneNumber ?? null,
      birthDate: null,
      notes: null,
      status: EnrollmentStatus.PENDING,
      studentUserId: studentMembership.userId,
      expedient: {}
    });

    return this.enrollmentRepository.save(enrollment);
  }

  async findAll(
    filters: EnrollmentFiltersDto,
    schoolId: string
  ): Promise<PaginatedResultDto<Enrollment>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const query = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .where('enrollment.schoolId = :schoolId', { schoolId })
      .orderBy('enrollment.createdAt', 'DESC');

    if (filters.status) {
      query.andWhere('enrollment.status = :status', { status: filters.status });
    }

    if (filters.cycleId) {
      query.andWhere('enrollment.cycleId = :cycleId', { cycleId: filters.cycleId });
    }

    if (filters.sectionId) {
      query.andWhere('enrollment.sectionId = :sectionId', { sectionId: filters.sectionId });
    }

    query
      .leftJoinAndSelect('enrollment.section', 'section')
      .leftJoinAndSelect('section.grade', 'grade')
      .leftJoinAndSelect('enrollment.cycle', 'cycle');

    if (filters.search) {
      query.andWhere(
        '(LOWER(enrollment.firstName) LIKE :search OR LOWER(enrollment.lastName) LIKE :search OR LOWER(enrollment.email) LIKE :search)',
        { search: `%${filters.search.toLowerCase()}%` }
      );
    }

    query.skip((page - 1) * limit).take(limit);
    const [data, total] = await query.getManyAndCount();
    return paginate(data, total, page, limit);
  }

  async findById(id: string, schoolId: string): Promise<Enrollment> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id, schoolId },
      relations: { cycle: true, section: { grade: true } }
    });
    if (!enrollment) {
      throw new NotFoundException('Matrícula no encontrada');
    }
    return enrollment;
  }

  async updateStatus(
    id: string,
    status: EnrollmentStatus,
    schoolId: string
  ): Promise<Enrollment> {
    const enrollment = await this.findById(id, schoolId);
    enrollment.status = status;

    if (status === EnrollmentStatus.ACCEPTED && !enrollment.studentUserId) {
      const studentUser = await this.createStudentUser(enrollment, schoolId);
      enrollment.studentUserId = studentUser.id;
    }

    const savedEnrollment = await this.enrollmentRepository.save(enrollment);

    if (savedEnrollment.status === EnrollmentStatus.ACCEPTED && savedEnrollment.studentUserId && savedEnrollment.sectionId) {
      await this.syncStudentAssignments(savedEnrollment, schoolId);
    }

    return savedEnrollment;
  }

  async generateExpedient(id: string, schoolId: string): Promise<Record<string, unknown>> {
    const enrollment = await this.findById(id, schoolId);
    const cycle = await this.academicCyclesService.findById(enrollment.cycleId, schoolId);

    const expedient = {
      enrollmentId: enrollment.id,
      student: {
        firstName: enrollment.firstName,
        lastName: enrollment.lastName,
        email: enrollment.email,
        phoneNumber: enrollment.phoneNumber,
        birthDate: enrollment.birthDate
      },
      cycle: {
        id: cycle.id,
        name: cycle.name
      },
      status: enrollment.status,
      generatedAt: new Date().toISOString(),
      notes: enrollment.notes
    };

    enrollment.expedient = expedient;
    await this.enrollmentRepository.save(enrollment);

    return expedient;
  }

  async getEnrollmentHistory(studentId: string, schoolId: string): Promise<Enrollment[]> {
    return this.enrollmentRepository.find({
      where: { schoolId, studentUserId: studentId },
      order: { createdAt: 'DESC' }
    });
  }

  private async createStudentUser(enrollment: Enrollment, schoolId: string) {
    const existing = await this.usersService.findByEmail(enrollment.email);
    if (existing) {
      await this.usersService.createMembership({
        userId: existing.id,
        schoolId,
        role: Role.STUDENT
      });

      return existing;
    }

    return this.usersService.createGlobalUser({
      firstName: enrollment.firstName,
      lastName: enrollment.lastName,
      phoneNumber: enrollment.phoneNumber ?? undefined,
      email: enrollment.email,
      password: `Temp${Date.now()}!`
    }).then(async (user) => {
      await this.usersService.createMembership({
        userId: user.id,
        schoolId,
        role: Role.STUDENT
      });
      return user;
    });
  }

  private async syncStudentAssignments(enrollment: Enrollment, schoolId: string): Promise<void> {
    const classesRepository = this.enrollmentRepository.manager.getRepository(SchoolClass);
    const classes = await classesRepository.find({
      where: {
        schoolId,
        cycleId: enrollment.cycleId,
        ...(enrollment.sectionId ? { sectionId: enrollment.sectionId } : {})
      }
    });

    for (const schoolClass of classes) {
      await this.usersService.assignStudentToClass(enrollment.studentUserId!, schoolClass.id, schoolId);
    }
  }
}
