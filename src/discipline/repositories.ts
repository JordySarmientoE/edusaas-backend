import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepository } from '../common/repositories/typeorm.repository';
import { Incident } from './entities/incident.entity';

@Injectable()
export class IncidentsRepository extends TypeOrmRepository<Incident> {
  constructor(dataSource: DataSource) {
    super(Incident, dataSource);
  }
}
