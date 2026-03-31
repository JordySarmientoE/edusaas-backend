import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AcademicCycle } from '../academic-cycles/entities/academic-cycle.entity';
import { Grade } from '../academic-cycles/entities/grade.entity';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { SchoolClass } from '../classes/entities/class.entity';
import { TypeOrmRepository } from '../common/repositories/typeorm.repository';
import { Incident } from '../discipline/entities/incident.entity';
import { IssuedDocument } from '../documents/entities/issued-document.entity';
import { Enrollment } from '../enrollment/entities/enrollment.entity';
import { GradeRecord } from '../grades/entities/grade-record.entity';
import { Task } from '../tasks/entities/task.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ReportsAttendanceRepository extends TypeOrmRepository<AttendanceRecord> {
  constructor(dataSource: DataSource) {
    super(AttendanceRecord, dataSource);
  }
}

@Injectable()
export class ReportsGradesRepository extends TypeOrmRepository<GradeRecord> {
  constructor(dataSource: DataSource) {
    super(GradeRecord, dataSource);
  }
}

@Injectable()
export class ReportsTasksRepository extends TypeOrmRepository<Task> {
  constructor(dataSource: DataSource) {
    super(Task, dataSource);
  }
}

@Injectable()
export class ReportsIncidentsRepository extends TypeOrmRepository<Incident> {
  constructor(dataSource: DataSource) {
    super(Incident, dataSource);
  }
}

@Injectable()
export class ReportsClassesRepository extends TypeOrmRepository<SchoolClass> {
  constructor(dataSource: DataSource) {
    super(SchoolClass, dataSource);
  }
}

@Injectable()
export class ReportsAcademicGradesRepository extends TypeOrmRepository<Grade> {
  constructor(dataSource: DataSource) {
    super(Grade, dataSource);
  }
}

@Injectable()
export class ReportsAcademicCyclesRepository extends TypeOrmRepository<AcademicCycle> {
  constructor(dataSource: DataSource) {
    super(AcademicCycle, dataSource);
  }
}

@Injectable()
export class ReportsUsersRepository extends TypeOrmRepository<User> {
  constructor(dataSource: DataSource) {
    super(User, dataSource);
  }
}

@Injectable()
export class ReportsEnrollmentsRepository extends TypeOrmRepository<Enrollment> {
  constructor(dataSource: DataSource) {
    super(Enrollment, dataSource);
  }
}

@Injectable()
export class ReportsIssuedDocumentsRepository extends TypeOrmRepository<IssuedDocument> {
  constructor(dataSource: DataSource) {
    super(IssuedDocument, dataSource);
  }
}
