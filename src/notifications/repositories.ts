import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SchoolClass } from '../classes/entities/class.entity';
import { TypeOrmRepository } from '../common/repositories/typeorm.repository';
import { TaskGrade } from '../tasks/entities/task-grade.entity';
import { Task } from '../tasks/entities/task.entity';
import { ParentStudentLink } from '../users/entities/parent-student-link.entity';
import { StudentClassAssignment } from '../users/entities/student-class-assignment.entity';
import { User } from '../users/entities/user.entity';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsRepository extends TypeOrmRepository<Notification> {
  constructor(dataSource: DataSource) {
    super(Notification, dataSource);
  }
}

@Injectable()
export class NotificationStudentAssignmentsRepository extends TypeOrmRepository<StudentClassAssignment> {
  constructor(dataSource: DataSource) {
    super(StudentClassAssignment, dataSource);
  }
}

@Injectable()
export class NotificationParentLinksRepository extends TypeOrmRepository<ParentStudentLink> {
  constructor(dataSource: DataSource) {
    super(ParentStudentLink, dataSource);
  }
}

@Injectable()
export class NotificationUsersRepository extends TypeOrmRepository<User> {
  constructor(dataSource: DataSource) {
    super(User, dataSource);
  }
}

@Injectable()
export class NotificationClassesRepository extends TypeOrmRepository<SchoolClass> {
  constructor(dataSource: DataSource) {
    super(SchoolClass, dataSource);
  }
}

@Injectable()
export class NotificationTasksRepository extends TypeOrmRepository<Task> {
  constructor(dataSource: DataSource) {
    super(Task, dataSource);
  }
}

@Injectable()
export class NotificationTaskGradesRepository extends TypeOrmRepository<TaskGrade> {
  constructor(dataSource: DataSource) {
    super(TaskGrade, dataSource);
  }
}
