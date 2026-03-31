import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { TaskGrade } from '../tasks/entities/task-grade.entity';
import { Task } from '../tasks/entities/task.entity';
import { TypeOrmRepository } from '../common/repositories/typeorm.repository';
import { ParentStudentLink } from '../users/entities/parent-student-link.entity';
import { User } from '../users/entities/user.entity';
import { ClassGradeConfig } from './entities/class-grade-config.entity';
import { GradeRecord } from './entities/grade-record.entity';

@Injectable()
export class GradeRecordsRepository extends TypeOrmRepository<GradeRecord> {
  constructor(dataSource: DataSource) {
    super(GradeRecord, dataSource);
  }
}

@Injectable()
export class GradeParentLinksRepository extends TypeOrmRepository<ParentStudentLink> {
  constructor(dataSource: DataSource) {
    super(ParentStudentLink, dataSource);
  }
}

@Injectable()
export class ClassGradeConfigsRepository extends TypeOrmRepository<ClassGradeConfig> {
  constructor(dataSource: DataSource) {
    super(ClassGradeConfig, dataSource);
  }
}

@Injectable()
export class GradeTasksRepository extends TypeOrmRepository<Task> {
  constructor(dataSource: DataSource) {
    super(Task, dataSource);
  }
}

@Injectable()
export class GradeTaskGradesRepository extends TypeOrmRepository<TaskGrade> {
  constructor(dataSource: DataSource) {
    super(TaskGrade, dataSource);
  }
}

@Injectable()
export class GradeUsersRepository extends TypeOrmRepository<User> {
  constructor(dataSource: DataSource) {
    super(User, dataSource);
  }
}

@Injectable()
export class GradeAttendanceRecordsRepository extends TypeOrmRepository<AttendanceRecord> {
  constructor(dataSource: DataSource) {
    super(AttendanceRecord, dataSource);
  }
}
