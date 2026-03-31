import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepository } from '../common/repositories/typeorm.repository';
import { ParentStudentLink } from '../users/entities/parent-student-link.entity';
import { StudentClassAssignment } from '../users/entities/student-class-assignment.entity';
import { AttendanceRecord } from './entities/attendance-record.entity';

@Injectable()
export class AttendanceRecordsRepository extends TypeOrmRepository<AttendanceRecord> {
  constructor(dataSource: DataSource) {
    super(AttendanceRecord, dataSource);
  }
}

@Injectable()
export class AttendanceStudentAssignmentsRepository extends TypeOrmRepository<StudentClassAssignment> {
  constructor(dataSource: DataSource) {
    super(StudentClassAssignment, dataSource);
  }
}

@Injectable()
export class AttendanceParentLinksRepository extends TypeOrmRepository<ParentStudentLink> {
  constructor(dataSource: DataSource) {
    super(ParentStudentLink, dataSource);
  }
}
