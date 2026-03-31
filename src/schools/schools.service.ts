import { ConflictException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { PaginatedResultDto } from '../common/dto/paginated-result.dto';
import { Role } from '../common/enums/role.enum';
import { paginate } from '../common/helpers/paginate.helper';
import { UsersService } from '../users/users.service';
import { AssignSchoolAdminDto } from './dto/assign-school-admin.dto';
import { CreateSchoolDto } from './dto/create-school.dto';
import { SchoolFiltersDto } from './dto/school-filters.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { School } from './entities/school.entity';
import { SchoolsRepository } from './repositories';

@Injectable()
export class SchoolsService {
  constructor(
    private readonly schoolsRepository: SchoolsRepository,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService
  ) {}

  async createSchool(dto: CreateSchoolDto): Promise<School> {
    const existing = await this.schoolsRepository.findOne({ where: [{ slug: dto.slug }, { name: dto.name }] });

    if (existing) {
      throw new ConflictException('Ya existe un colegio con ese nombre o slug');
    }

    const school = this.schoolsRepository.create({
      name: dto.name,
      slug: dto.slug,
      contactEmail: dto.contactEmail ?? null,
      isActive: true
    });

    return this.schoolsRepository.save(school);
  }

  async findAll(filters: SchoolFiltersDto): Promise<PaginatedResultDto<School>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const query = this.schoolsRepository.createQueryBuilder('school').orderBy('school.createdAt', 'DESC');

    if (filters.search) {
      query.where('LOWER(school.name) LIKE :search OR LOWER(school.slug) LIKE :search', {
        search: `%${filters.search.toLowerCase()}%`
      });
    }

    query.skip((page - 1) * limit).take(limit);
    const [data, total] = await query.getManyAndCount();
    return paginate(data, total, page, limit);
  }

  async findById(id: string): Promise<School> {
    const school = await this.schoolsRepository.findOne({ where: { id } });

    if (!school) {
      throw new NotFoundException('Colegio no encontrado');
    }

    return school;
  }

  async updateSchool(id: string, dto: UpdateSchoolDto): Promise<School> {
    const school = await this.findById(id);

    if (dto.slug && dto.slug !== school.slug) {
      const slugTaken = await this.schoolsRepository.findOne({ where: { slug: dto.slug } });
      if (slugTaken) {
        throw new ConflictException('El slug del colegio ya está en uso');
      }
    }

    Object.assign(school, dto);
    return this.schoolsRepository.save(school);
  }

  async deactivateSchool(id: string): Promise<void> {
    const school = await this.findById(id);
    school.isActive = false;
    await this.schoolsRepository.save(school);
  }

  async activateSchool(id: string): Promise<void> {
    const school = await this.findById(id);
    school.isActive = true;
    await this.schoolsRepository.save(school);
  }

  async assignSchoolAdmin(schoolId: string, dto: AssignSchoolAdminDto, invitedByUserId: string) {
    const school = await this.findById(schoolId);

    if (!school.isActive) {
      throw new ConflictException('Solo puedes asignar administradores a colegios activos');
    }

    return this.usersService.associateUserByEmail(
      {
        email: dto.email,
        role: Role.SCHOOL_ADMIN
      },
      schoolId,
      invitedByUserId
    );
  }

  async getUsersBySchool(schoolId: string) {
    await this.findById(schoolId);
    return this.usersService.findBySchoolId(schoolId);
  }

  async getAdminsBySchool(schoolId: string) {
    await this.findById(schoolId);
    return this.usersService.findAdminMembershipsBySchool(schoolId);
  }
}
