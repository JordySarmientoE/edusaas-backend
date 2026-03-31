import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepository } from '../common/repositories/typeorm.repository';
import { ClassGradeConfig } from '../grades/entities/class-grade-config.entity';
import { ParentStudentLink } from '../users/entities/parent-student-link.entity';
import { StudentClassAssignment } from '../users/entities/student-class-assignment.entity';
import { TaskGrade } from './entities/task-grade.entity';
import { TaskSubmission } from './entities/task-submission.entity';
import { Task } from './entities/task.entity';

@Injectable()
export class TasksRepository extends TypeOrmRepository<Task> {
  constructor(dataSource: DataSource) {
    super(Task, dataSource);
  }
}

@Injectable()
export class TaskStudentAssignmentsRepository extends TypeOrmRepository<StudentClassAssignment> {
  constructor(dataSource: DataSource) {
    super(StudentClassAssignment, dataSource);
  }
}

@Injectable()
export class TaskGradesRepository extends TypeOrmRepository<TaskGrade> {
  constructor(dataSource: DataSource) {
    super(TaskGrade, dataSource);
  }
}

@Injectable()
export class TaskSubmissionsRepository extends TypeOrmRepository<TaskSubmission> {
  constructor(dataSource: DataSource) {
    super(TaskSubmission, dataSource);
  }
}

@Injectable()
export class TaskParentLinksRepository extends TypeOrmRepository<ParentStudentLink> {
  constructor(dataSource: DataSource) {
    super(ParentStudentLink, dataSource);
  }
}

@Injectable()
export class TaskClassGradeConfigsRepository extends TypeOrmRepository<ClassGradeConfig> {
  constructor(dataSource: DataSource) {
    super(ClassGradeConfig, dataSource);
  }
}
