import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolClass } from '../classes/entities/class.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { ParentStudentLink } from '../users/entities/parent-student-link.entity';
import { StudentClassAssignment } from '../users/entities/student-class-assignment.entity';
import { TaskGrade } from '../tasks/entities/task-grade.entity';
import { Task } from '../tasks/entities/task.entity';
import { User } from '../users/entities/user.entity';
import { TasksModule } from '../tasks/tasks.module';
import {
  NotificationClassesRepository,
  NotificationParentLinksRepository,
  NotificationTaskGradesRepository,
  NotificationTasksRepository,
  NotificationsRepository,
  NotificationStudentAssignmentsRepository,
  NotificationUsersRepository
} from './repositories';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, StudentClassAssignment, ParentStudentLink, User, SchoolClass, Task, TaskGrade]),
    forwardRef(() => TasksModule)
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRepository,
    NotificationStudentAssignmentsRepository,
    NotificationParentLinksRepository,
    NotificationUsersRepository,
    NotificationClassesRepository,
    NotificationTasksRepository,
    NotificationTaskGradesRepository
  ],
  exports: [NotificationsService]
})
export class NotificationsModule {}
