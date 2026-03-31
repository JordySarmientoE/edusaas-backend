import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepository } from '../common/repositories/typeorm.repository';
import { Enrollment } from './entities/enrollment.entity';

@Injectable()
export class EnrollmentsRepository extends TypeOrmRepository<Enrollment> {
  constructor(dataSource: DataSource) {
    super(Enrollment, dataSource);
  }
}
