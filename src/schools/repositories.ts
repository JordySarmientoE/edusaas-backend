import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepository } from '../common/repositories/typeorm.repository';
import { School } from './entities/school.entity';

@Injectable()
export class SchoolsRepository extends TypeOrmRepository<School> {
  constructor(dataSource: DataSource) {
    super(School, dataSource);
  }
}
