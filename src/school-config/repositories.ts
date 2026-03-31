import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepository } from '../common/repositories/typeorm.repository';
import { SchoolConfig } from './entities/school-config.entity';

@Injectable()
export class SchoolConfigsRepository extends TypeOrmRepository<SchoolConfig> {
  constructor(dataSource: DataSource) {
    super(SchoolConfig, dataSource);
  }
}
