import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassesModule } from '../classes/classes.module';
import { StorageService } from '../common/services/storage.service';
import { ClassGradeConfig } from '../grades/entities/class-grade-config.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { ParentStudentLink } from '../users/entities/parent-student-link.entity';
import { StudentClassAssignment } from '../users/entities/student-class-assignment.entity';
import { SchoolConfigModule } from '../school-config/school-config.module';
import { TaskGrade } from './entities/task-grade.entity';
import { TaskSubmission } from './entities/task-submission.entity';
import { Task } from './entities/task.entity';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import {
  TaskGradesRepository,
  TaskClassGradeConfigsRepository,
  TaskParentLinksRepository,
  TaskSubmissionsRepository,
  TasksRepository,
  TaskStudentAssignmentsRepository
} from './repositories';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, TaskGrade, TaskSubmission, StudentClassAssignment, ParentStudentLink, ClassGradeConfig]),
    forwardRef(() => ClassesModule),
    UsersModule,
    SchoolConfigModule,
    forwardRef(() => NotificationsModule)
  ],
  controllers: [TasksController],
  providers: [
    TasksService,
    StorageService,
    TasksRepository,
    TaskGradesRepository,
    TaskSubmissionsRepository,
    TaskStudentAssignmentsRepository,
    TaskParentLinksRepository,
    TaskClassGradeConfigsRepository
  ],
  exports: [TasksService]
})
export class TasksModule {}
