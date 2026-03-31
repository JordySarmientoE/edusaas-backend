import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { In } from 'typeorm';
import { ClassesService } from '../classes/classes.service';
import { PaginatedResultDto } from '../common/dto/paginated-result.dto';
import { Role } from '../common/enums/role.enum';
import { paginate } from '../common/helpers/paginate.helper';
import { StorageService } from '../common/services/storage.service';
import { Enrollment, EnrollmentStatus } from '../enrollment/entities/enrollment.entity';
import { AdminUserMembershipDto } from './dto/admin-user-membership.dto';
import { AssociateUserByEmailDto } from './dto/associate-user-by-email.dto';
import { ChangeOwnPasswordDto } from './dto/change-own-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { FamilyLinksDto } from './dto/family-links.dto';
import { LinkedStudentDto } from './dto/linked-student.dto';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserFiltersDto } from './dto/user-filters.dto';
import { UserProfileDto } from './dto/user-profile.dto';
import { SchoolInvitationStatus } from './entities/school-invitation.entity';
import { SchoolMembership, SchoolMembershipStatus } from './entities/school-membership.entity';
import { User } from './entities/user.entity';
import {
  ParentStudentLinksRepository,
  SchoolInvitationsRepository,
  SchoolMembershipsRepository,
  StudentClassAssignmentsRepository,
  UsersRepository
} from './repositories';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly parentStudentLinksRepository: ParentStudentLinksRepository,
    private readonly studentClassAssignmentsRepository: StudentClassAssignmentsRepository,
    private readonly schoolMembershipsRepository: SchoolMembershipsRepository,
    private readonly schoolInvitationsRepository: SchoolInvitationsRepository,
    @Inject(forwardRef(() => ClassesService))
    private readonly classesService: ClassesService,
    private readonly storageService: StorageService
  ) {}

  async createUser(dto: CreateUserDto, schoolId: string | null = dto.schoolId ?? null): Promise<User> {
    const user = await this.createGlobalUser({
      firstName: dto.firstName,
      lastName: dto.lastName,
      phoneNumber: dto.phoneNumber,
      email: dto.email,
      password: dto.password
    });

    if (schoolId && dto.role !== Role.SUPER_ADMIN) {
      await this.createMembership({
        userId: user.id,
        schoolId,
        role: dto.role
      });
    }

    return user;
  }

  async createGlobalUser(input: {
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    email: string;
    password: string;
  }): Promise<User> {
    const existing = await this.usersRepository.findOne({ where: { email: input.email } });

    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese correo');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = this.usersRepository.create({
      schoolId: null,
      firstName: input.firstName,
      lastName: input.lastName,
      phoneNumber: input.phoneNumber ?? null,
      email: input.email,
      passwordHash,
      role: Role.PLATFORM_USER,
      isActive: true,
      refreshTokenHash: null
    });

    const saved = await this.usersRepository.save(user);
    await this.resolvePendingInvitations(saved);
    return saved;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findActiveMembershipByEmailInSchool(email: string, schoolId: string, role?: Role): Promise<SchoolMembership | null> {
    const query = this.schoolMembershipsRepository
      .createQueryBuilder('membership')
      .innerJoinAndSelect('membership.user', 'user')
      .where('membership.schoolId = :schoolId', { schoolId })
      .andWhere('membership.status = :status', { status: SchoolMembershipStatus.ACTIVE })
      .andWhere('LOWER(user.email) = :email', { email: email.toLowerCase() });

    if (role) {
      query.andWhere('membership.role = :role', { role });
    }

    return query.getOne();
  }

  async findAll(filters: UserFiltersDto, schoolId: string): Promise<PaginatedResultDto<AdminUserMembershipDto>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const query = this.schoolMembershipsRepository
      .createQueryBuilder('membership')
      .innerJoinAndSelect('membership.user', 'user')
      .where('membership.schoolId = :schoolId', { schoolId })
      .orderBy('membership.createdAt', 'DESC');

    if (filters.role) {
      query.andWhere('membership.role = :role', { role: filters.role });
    }

    if (filters.status) {
      query.andWhere('membership.status = :status', { status: filters.status });
    }

    if (filters.search) {
      query.andWhere(
        '(LOWER(user.firstName) LIKE :search OR LOWER(user.lastName) LIKE :search OR LOWER(user.email) LIKE :search)',
        { search: `%${filters.search.toLowerCase()}%` }
      );
    }

    query.skip((page - 1) * limit).take(limit);
    const [data, total] = await query.getManyAndCount();
    const mapped = await this.mapAdminMemberships(data, schoolId);
    return paginate(mapped, total, page, limit);
  }

  async findById(id: string, schoolId?: string | null): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (schoolId !== undefined && schoolId !== null && user.role !== Role.SUPER_ADMIN) {
      await this.getMembershipForUserInSchool(id, schoolId);
    }

    return user;
  }

  async findBySchoolId(schoolId: string): Promise<User[]> {
    return this.usersRepository
      .createQueryBuilder('user')
      .innerJoin(SchoolMembership, 'membership', 'membership.userId = user.id')
      .where('membership.schoolId = :schoolId', { schoolId })
      .andWhere('membership.status = :status', { status: SchoolMembershipStatus.ACTIVE })
      .getMany();
  }

  async findAdminMembershipsBySchool(schoolId: string): Promise<AdminUserMembershipDto[]> {
    const memberships = await this.schoolMembershipsRepository.find({
      where: {
        schoolId,
        role: Role.SCHOOL_ADMIN,
        status: SchoolMembershipStatus.ACTIVE
      },
      relations: { user: true, school: true },
      order: { createdAt: 'ASC' }
    });

    return this.mapAdminMemberships(memberships, schoolId);
  }

  async listMemberships(userId: string): Promise<SchoolMembership[]> {
    const memberships = await this.schoolMembershipsRepository.find({
      where: { userId },
      relations: { school: true },
      order: { createdAt: 'ASC' }
    });

    if (memberships.length > 0) {
      return memberships;
    }

    const user = await this.findById(userId);
    await this.ensureLegacyMembership(user);

    return this.schoolMembershipsRepository.find({
      where: { userId },
      relations: { school: true },
      order: { createdAt: 'ASC' }
    });
  }

  async getMembershipByIdForUser(userId: string, membershipId: string): Promise<SchoolMembership> {
    const membership = await this.schoolMembershipsRepository.findOne({
      where: { id: membershipId, userId, status: SchoolMembershipStatus.ACTIVE },
      relations: { school: true }
    });

    if (!membership) {
      throw new NotFoundException('Membresía no encontrada para el usuario');
    }

    return membership;
  }

  async getMembershipByIdForSchool(membershipId: string, schoolId: string): Promise<SchoolMembership> {
    const membership = await this.schoolMembershipsRepository.findOne({
      where: { id: membershipId, schoolId },
      relations: { user: true, school: true }
    });

    if (!membership) {
      throw new NotFoundException('Membresía no encontrada en el colegio');
    }

    return membership;
  }

  async createMembership(params: {
    userId: string;
    schoolId: string;
    role: Role;
    status?: SchoolMembershipStatus;
    invitedByUserId?: string | null;
  }): Promise<SchoolMembership> {
    const existing = await this.schoolMembershipsRepository.findOne({
      where: {
        userId: params.userId,
        schoolId: params.schoolId,
        role: params.role
      }
    });

    if (existing) {
      if (existing.role !== params.role || existing.status !== (params.status ?? SchoolMembershipStatus.ACTIVE)) {
        existing.role = params.role;
        existing.status = params.status ?? SchoolMembershipStatus.ACTIVE;
        existing.invitedByUserId = params.invitedByUserId ?? existing.invitedByUserId;
        existing.joinedAt =
          existing.status === SchoolMembershipStatus.PENDING ? null : existing.joinedAt ?? new Date();
        return this.schoolMembershipsRepository.save(existing);
      }
      return existing;
    }

    const membership = this.schoolMembershipsRepository.create({
      userId: params.userId,
      schoolId: params.schoolId,
      role: params.role,
      status: params.status ?? SchoolMembershipStatus.ACTIVE,
      invitedByUserId: params.invitedByUserId ?? null,
      joinedAt: params.status === SchoolMembershipStatus.PENDING ? null : new Date()
    });

    return this.schoolMembershipsRepository.save(membership);
  }

  async getMembershipForUserInSchool(userId: string, schoolId: string): Promise<SchoolMembership> {
    const membership = await this.schoolMembershipsRepository.findOne({
      where: { userId, schoolId, status: SchoolMembershipStatus.ACTIVE },
      order: { createdAt: 'ASC' }
    });

    if (membership) {
      return membership;
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.schoolId === schoolId && user.role !== Role.SUPER_ADMIN) {
      await this.ensureLegacyMembership(user);

      const legacyMembership = await this.schoolMembershipsRepository.findOne({
        where: { userId, schoolId }
      });

      if (legacyMembership) {
        return legacyMembership;
      }
    }

    throw new NotFoundException('Usuario no pertenece al colegio solicitado');
  }

  async getRoleForUserInSchool(userId: string, schoolId: string): Promise<Role> {
    const user = await this.findById(userId);

    if (user.role === Role.SUPER_ADMIN) {
      return Role.SUPER_ADMIN;
    }

    const membership = await this.schoolMembershipsRepository.findOne({
      where: { userId, schoolId, status: SchoolMembershipStatus.ACTIVE },
      order: { createdAt: 'ASC' }
    });

    if (membership) {
      return membership.role;
    }

    await this.getMembershipForUserInSchool(userId, schoolId);
    throw new NotFoundException('Usuario no pertenece al colegio solicitado');
  }

  async ensureUserHasRoleInSchool(userId: string, schoolId: string, roles: Role[]): Promise<Role> {
    const user = await this.findById(userId);

    if (user.role === Role.SUPER_ADMIN && roles.includes(Role.SUPER_ADMIN)) {
      return Role.SUPER_ADMIN;
    }

    const memberships = await this.schoolMembershipsRepository.find({
      where: { userId, schoolId, status: SchoolMembershipStatus.ACTIVE }
    });

    const matchingMembership = memberships.find((membership) => roles.includes(membership.role));

    if (!matchingMembership) {
      throw new ConflictException('El usuario no tiene el rol esperado en el colegio');
    }

    return matchingMembership.role;
  }

  async ensureUserCanAccessLinkedStudentsInSchool(userId: string, schoolId: string): Promise<Role> {
    return this.ensureUserHasRoleInSchool(userId, schoolId, [Role.PARENT, Role.TEACHER, Role.SCHOOL_ADMIN]);
  }

  async associateUserByEmail(dto: AssociateUserByEmailDto, schoolId: string, invitedByUserId?: string) {
    const existingUser = await this.findByEmail(dto.email);

    if (existingUser) {
      const membership = await this.createMembership({
        userId: existingUser.id,
        schoolId,
        role: dto.role,
        status: SchoolMembershipStatus.ACTIVE,
        invitedByUserId: invitedByUserId ?? null
      });

      return {
        type: 'membership',
        membership
      };
    }

    const existingInvitation = await this.schoolInvitationsRepository.findOne({
      where: { schoolId, email: dto.email, role: dto.role }
    });

    if (existingInvitation) {
      existingInvitation.role = dto.role;
      existingInvitation.status = SchoolInvitationStatus.PENDING;
      existingInvitation.invitedByUserId = invitedByUserId ?? existingInvitation.invitedByUserId;
      await this.schoolInvitationsRepository.save(existingInvitation);

      return {
        type: 'invitation',
        invitation: existingInvitation
      };
    }

    const invitation = await this.schoolInvitationsRepository.save(
      this.schoolInvitationsRepository.create({
        schoolId,
        email: dto.email,
        role: dto.role,
        status: SchoolInvitationStatus.PENDING,
        invitedByUserId: invitedByUserId ?? null,
        acceptedByUserId: null,
        acceptedAt: null
      })
    );

    return {
      type: 'invitation',
      invitation
    };
  }

  private async ensureLegacyMembership(user: User): Promise<void> {
    if (!user.schoolId || user.role === Role.SUPER_ADMIN) {
      return;
    }

    const existing = await this.schoolMembershipsRepository.findOne({
      where: {
        userId: user.id,
        schoolId: user.schoolId,
      }
    });

    if (existing) {
      return;
    }

    await this.schoolMembershipsRepository.save(
      this.schoolMembershipsRepository.create({
        userId: user.id,
        schoolId: user.schoolId,
        role: user.role,
        status: SchoolMembershipStatus.ACTIVE,
        invitedByUserId: null,
        joinedAt: new Date()
      })
    );
  }

  async findMembershipDetail(membershipId: string, schoolId: string): Promise<AdminUserMembershipDto> {
    const membership = await this.getMembershipByIdForSchool(membershipId, schoolId);
    const [mapped] = await this.mapAdminMemberships([membership], schoolId);
    return mapped;
  }

  async updateMembership(membershipId: string, dto: UpdateUserDto, schoolId: string): Promise<AdminUserMembershipDto> {
    const membership = await this.getMembershipByIdForSchool(membershipId, schoolId);
    const user = membership.user ?? (await this.findById(membership.userId, schoolId));

    if (dto.email && dto.email !== user.email) {
      const existing = await this.usersRepository.findOne({ where: { email: dto.email } });
      if (existing) {
        throw new ConflictException('Ya existe un usuario con ese correo');
      }
      user.email = dto.email;
    }

    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 12);
    }

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.phoneNumber !== undefined) user.phoneNumber = dto.phoneNumber;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    if (dto.role !== undefined && user.role !== Role.SUPER_ADMIN) {
      membership.role = dto.role;
    }

    await this.usersRepository.save(user);
    const savedMembership = await this.schoolMembershipsRepository.save(membership);
    const [mapped] = await this.mapAdminMemberships([{
      ...savedMembership,
      user
    } as SchoolMembership], schoolId);
    return mapped;
  }

  async deactivateMembership(membershipId: string, schoolId: string): Promise<void> {
    const membership = await this.getMembershipByIdForSchool(membershipId, schoolId);
    membership.status = SchoolMembershipStatus.INACTIVE;
    await this.schoolMembershipsRepository.save(membership);
  }

  async activateMembership(membershipId: string, schoolId: string): Promise<void> {
    const membership = await this.getMembershipByIdForSchool(membershipId, schoolId);
    membership.status = SchoolMembershipStatus.ACTIVE;
    membership.joinedAt = membership.joinedAt ?? new Date();
    await this.schoolMembershipsRepository.save(membership);
  }

  async linkParentToStudent(parentId: string, studentId: string, schoolId: string): Promise<void> {
    await this.findById(parentId, schoolId);
    await this.findById(studentId, schoolId);
    await this.ensureUserCanAccessLinkedStudentsInSchool(parentId, schoolId);
    await this.ensureUserHasRoleInSchool(studentId, schoolId, [Role.STUDENT]);

    const existing = await this.parentStudentLinksRepository.findOne({
      where: { parentId, studentId }
    });
    if (existing) {
      return;
    }

    await this.parentStudentLinksRepository.save(
      this.parentStudentLinksRepository.create({
        schoolId,
        parentId,
        studentId
      })
    );
  }

  async getLinkedStudentsForParent(parentId: string, schoolId: string): Promise<LinkedStudentDto[]> {
    await this.findById(parentId, schoolId);
    await this.ensureUserHasRoleInSchool(parentId, schoolId, [Role.PARENT]);

    const links = await this.parentStudentLinksRepository.find({
      where: { schoolId, parentId },
      order: { createdAt: 'ASC' }
    });

    if (links.length === 0) {
      return [];
    }

    const studentIds = links.map((link) => link.studentId);
    const [students, assignments] = await Promise.all([
      this.usersRepository.find({
        where: { id: In(studentIds) }
      }),
      this.studentClassAssignmentsRepository.find({
        where: studentIds.map((studentId) => ({ schoolId, studentId }))
      })
    ]);

    const classIdsByStudentId = new Map<string, string[]>();
    for (const assignment of assignments) {
      const current = classIdsByStudentId.get(assignment.studentId) ?? [];
      if (!current.includes(assignment.classId)) {
        current.push(assignment.classId);
      }
      classIdsByStudentId.set(assignment.studentId, current);
    }

    return studentIds
      .map((studentId) => {
        const student = students.find((item) => item.id === studentId);
        if (!student) {
          return null;
        }

        return {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          classIds: classIdsByStudentId.get(student.id) ?? []
        };
      })
      .filter((student): student is LinkedStudentDto => Boolean(student));
  }

  async getOwnProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.findById(userId);
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      avatarUrl: user.avatarUrl
    };
  }

  async updateOwnProfile(userId: string, dto: UpdateOwnProfileDto): Promise<UserProfileDto> {
    const user = await this.findById(userId);

    if (dto.firstName !== undefined) {
      user.firstName = dto.firstName.trim();
    }

    if (dto.lastName !== undefined) {
      user.lastName = dto.lastName.trim();
    }

    if (dto.phoneNumber !== undefined) {
      user.phoneNumber = dto.phoneNumber?.trim() ? dto.phoneNumber.trim() : null;
    }

    const savedUser = await this.usersRepository.save(user);
    return {
      id: savedUser.id,
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
      phoneNumber: savedUser.phoneNumber,
      email: savedUser.email,
      avatarUrl: savedUser.avatarUrl
    };
  }

  async uploadOwnAvatar(
    userId: string,
    file?: { originalname: string; buffer: Buffer; mimetype?: string }
  ): Promise<UserProfileDto> {
    if (!file) {
      throw new NotFoundException('Selecciona una imagen para continuar');
    }

    const user = await this.findById(userId);
    user.avatarUrl = await this.storageService.storeUserAvatar(file);
    const savedUser = await this.usersRepository.save(user);

    return {
      id: savedUser.id,
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
      phoneNumber: savedUser.phoneNumber,
      email: savedUser.email,
      avatarUrl: savedUser.avatarUrl
    };
  }

  async removeOwnAvatar(userId: string): Promise<UserProfileDto> {
    const user = await this.findById(userId);
    user.avatarUrl = null;
    const savedUser = await this.usersRepository.save(user);

    return {
      id: savedUser.id,
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
      phoneNumber: savedUser.phoneNumber,
      email: savedUser.email,
      avatarUrl: savedUser.avatarUrl
    };
  }

  async changeOwnPassword(userId: string, dto: ChangeOwnPasswordDto): Promise<void> {
    const user = await this.findById(userId);
    const isValidPassword = await this.validatePassword(user, dto.currentPassword);

    if (!isValidPassword) {
      throw new ConflictException('La contraseña actual no es correcta');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new ConflictException('La nueva contraseña debe ser diferente a la actual');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.usersRepository.save(user);
    await this.updateRefreshToken(user.id, null);
  }

  async getFamilyLinks(userId: string, schoolId: string, role: Role): Promise<FamilyLinksDto> {
    if (![Role.PARENT, Role.STUDENT].includes(role)) {
      return { parents: [], children: [] };
    }

    const links = await this.parentStudentLinksRepository.find({
      where:
        role === Role.PARENT
          ? { schoolId, parentId: userId }
          : { schoolId, studentId: userId }
    });

    if (links.length === 0) {
      return { parents: [], children: [] };
    }

    const relatedIds =
      role === Role.PARENT
        ? [...new Set(links.map((link) => link.studentId))]
        : [...new Set(links.map((link) => link.parentId))];

    const relatedUsers = await this.usersRepository.find({
      where: { id: In(relatedIds) }
    });
    const relatedUsersById = new Map(relatedUsers.map((user) => [user.id, user]));

    if (role === Role.PARENT) {
      return {
        parents: [],
        children: relatedIds
          .map((id) => relatedUsersById.get(id))
          .filter((user): user is User => Boolean(user))
          .map((user) => ({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
          }))
      };
    }

    return {
      children: [],
      parents: relatedIds
        .map((id) => relatedUsersById.get(id))
        .filter((user): user is User => Boolean(user))
        .map((user) => ({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email
        }))
    };
  }

  async assignStudentToClass(studentId: string, classId: string, schoolId: string): Promise<void> {
    await this.findById(studentId, schoolId);
    await this.ensureUserHasRoleInSchool(studentId, schoolId, [Role.STUDENT]);
    await this.classesService.findById(classId, schoolId);

    const existing = await this.studentClassAssignmentsRepository.findOne({
      where: { studentId, classId }
    });
    if (existing) {
      return;
    }

    await this.studentClassAssignmentsRepository.save(
      this.studentClassAssignmentsRepository.create({
        schoolId,
        studentId,
        classId
      })
    );
  }

  async getStudentsByClass(classId: string, schoolId: string): Promise<User[]> {
    const assignments = await this.studentClassAssignmentsRepository.find({
      where: { schoolId, classId },
      relations: { student: true },
      order: { createdAt: 'ASC' }
    });

    const assignedStudents = assignments
      .map((assignment) => assignment.student)
      .filter((student): student is User => Boolean(student));

    if (assignedStudents.length > 0) {
      return assignedStudents;
    }

    const schoolClass = await this.classesService.findById(classId, schoolId);
    const enrollmentsRepository = this.usersRepository.manager.getRepository(Enrollment);
    const acceptedEnrollments = await enrollmentsRepository.find({
      where: {
        schoolId,
        cycleId: schoolClass.cycleId,
        sectionId: schoolClass.sectionId,
        status: EnrollmentStatus.ACCEPTED
      },
      order: { createdAt: 'ASC' }
    });

    const students: User[] = [];

    for (const enrollment of acceptedEnrollments) {
      if (!enrollment.studentUserId) {
        continue;
      }

      await this.assignStudentToClass(enrollment.studentUserId, classId, schoolId);
      const student = await this.findById(enrollment.studentUserId, schoolId);
      students.push(student);
    }

    return students;
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    const refreshTokenHash = refreshToken ? await bcrypt.hash(refreshToken, 12) : null;
    await this.usersRepository.update(userId, { refreshTokenHash });
  }

  async validateRefreshToken(userId: string, refreshToken: string): Promise<User> {
    const user = await this.findById(userId);

    if (!user.refreshTokenHash) {
      throw new NotFoundException('Sesión no encontrada');
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);

    if (!isValid) {
      throw new NotFoundException('Refresh token inválido');
    }

    return user;
  }

  private async resolvePendingInvitations(user: User): Promise<void> {
    const invitations = await this.schoolInvitationsRepository.find({
      where: {
        email: user.email,
        status: SchoolInvitationStatus.PENDING
      }
    });

    for (const invitation of invitations) {
      await this.createMembership({
        userId: user.id,
        schoolId: invitation.schoolId,
        role: invitation.role,
        status: SchoolMembershipStatus.ACTIVE,
        invitedByUserId: invitation.invitedByUserId
      });

      invitation.status = SchoolInvitationStatus.ACCEPTED;
      invitation.acceptedByUserId = user.id;
      invitation.acceptedAt = new Date();
      await this.schoolInvitationsRepository.save(invitation);
    }
  }

  private async mapAdminMemberships(
    memberships: SchoolMembership[],
    schoolId: string
  ): Promise<AdminUserMembershipDto[]> {
    const parentIds = memberships.filter((membership) => membership.role === Role.PARENT).map((membership) => membership.userId);
    const studentIds = memberships.filter((membership) => membership.role === Role.STUDENT).map((membership) => membership.userId);

    let linkedStudentsByParentId = new Map<string, AdminUserMembershipDto['linkedStudents']>();
    let linkedParentsByStudentId = new Map<string, AdminUserMembershipDto['linkedParents']>();

    if (parentIds.length > 0 || studentIds.length > 0) {
      const whereClauses = [
        ...parentIds.map((parentId) => ({ schoolId, parentId })),
        ...studentIds.map((studentId) => ({ schoolId, studentId }))
      ];

      const links = await this.parentStudentLinksRepository.find({
        where: whereClauses
      });
      const relatedStudentIds = [...new Set(links.map((link) => link.studentId))];
      const relatedParentIds = [...new Set(links.map((link) => link.parentId))];
      const students = relatedStudentIds.length > 0
        ? await this.usersRepository.find({ where: { id: In(relatedStudentIds) } })
        : [];
      const parents = relatedParentIds.length > 0
        ? await this.usersRepository.find({ where: { id: In(relatedParentIds) } })
        : [];
      const studentsById = new Map(students.map((student) => [student.id, student]));
      const parentsById = new Map(parents.map((parent) => [parent.id, parent]));

      linkedStudentsByParentId = links.reduce((map, link) => {
        const student = studentsById.get(link.studentId);
        if (!student) {
          return map;
        }

        const current = map.get(link.parentId) ?? [];
        current.push({
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email
        });
        map.set(link.parentId, current);
        return map;
      }, new Map<string, AdminUserMembershipDto['linkedStudents']>());

      linkedParentsByStudentId = links.reduce((map, link) => {
        const parent = parentsById.get(link.parentId);
        if (!parent) {
          return map;
        }

        const current = map.get(link.studentId) ?? [];
        current.push({
          id: parent.id,
          firstName: parent.firstName,
          lastName: parent.lastName,
          email: parent.email
        });
        map.set(link.studentId, current);
        return map;
      }, new Map<string, AdminUserMembershipDto['linkedParents']>());
    }

    return memberships.map((membership) => {
      const user = membership.user;

      return {
        membershipId: membership.id,
        userId: membership.userId,
        schoolId: membership.schoolId,
        role: membership.role,
        status: membership.status,
        firstName: user?.firstName ?? '',
        lastName: user?.lastName ?? '',
        phoneNumber: user?.phoneNumber ?? null,
        email: user?.email ?? '',
        isActive: membership.status === SchoolMembershipStatus.ACTIVE,
        schoolName: membership.school?.name ?? null,
        linkedStudents: linkedStudentsByParentId.get(membership.userId) ?? [],
        linkedParents: linkedParentsByStudentId.get(membership.userId) ?? []
      };
    });
  }
}
