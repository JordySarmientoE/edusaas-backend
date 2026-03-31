import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditLog } from './entities/audit-log.entity';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AuditFiltersDto } from './dto/audit-filters.dto';
import { AuditService } from './audit.service';

@Controller('audit-logs')
@ApiTags('Audit')
@ApiBearerAuth('access-token')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Consultar el historial de auditoria' })
  @ApiOkResponse({ type: AuditLog, isArray: true })
  getHistory(
    @Query() filters: AuditFiltersDto,
    @Req() request: { schoolId?: string | null }
  ) {
    return this.auditService.getHistory(filters, request.schoolId ?? null);
  }
}
