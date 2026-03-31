import { Injectable } from '@nestjs/common';
import { PaginatedResultDto } from '../common/dto/paginated-result.dto';
import { paginate } from '../common/helpers/paginate.helper';
import { AuditFiltersDto } from './dto/audit-filters.dto';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogsRepository } from './repositories';

@Injectable()
export class AuditService {
  constructor(
    private readonly auditRepository: AuditLogsRepository
  ) {}

  async log(dto: CreateAuditLogDto): Promise<void> {
    const entity = this.auditRepository.create({
      ...dto,
      metadata: dto.metadata ?? {}
    });

    await this.auditRepository.save(entity);
  }

  async getHistory(
    filters: AuditFiltersDto,
    schoolId: string | null
  ): Promise<PaginatedResultDto<AuditLog>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;

    const query = this.auditRepository.createQueryBuilder('audit').orderBy('audit.createdAt', 'DESC');

    if (schoolId) {
      query.andWhere('audit.schoolId = :schoolId', { schoolId });
    }

    if (filters.action) {
      query.andWhere('audit.action = :action', { action: filters.action });
    }

    if (filters.entityType) {
      query.andWhere('audit.entityType = :entityType', { entityType: filters.entityType });
    }

    if (filters.userId) {
      query.andWhere('audit.userId = :userId', { userId: filters.userId });
    }

    query.skip((page - 1) * limit).take(limit);

    const [data, total] = await query.getManyAndCount();
    return paginate(data, total, page, limit);
  }
}
