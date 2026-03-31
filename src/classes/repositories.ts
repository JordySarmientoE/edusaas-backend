import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepository } from '../common/repositories/typeorm.repository';
import { SchoolClass } from './entities/class.entity';
import { Schedule } from './entities/schedule.entity';

@Injectable()
export class SchoolClassesRepository extends TypeOrmRepository<SchoolClass> {
  constructor(dataSource: DataSource) {
    super(SchoolClass, dataSource);
  }
}

@Injectable()
export class SchedulesRepository extends TypeOrmRepository<Schedule> {
  constructor(dataSource: DataSource) {
    super(Schedule, dataSource);
  }
}
