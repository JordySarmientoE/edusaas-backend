import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepository } from '../common/repositories/typeorm.repository';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditLogsRepository extends TypeOrmRepository<AuditLog> {
  constructor(dataSource: DataSource) {
    super(AuditLog, dataSource);
  }
}
