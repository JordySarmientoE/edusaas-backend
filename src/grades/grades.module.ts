import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicCyclesModule } from '../academic-cycles/academic-cycles.module';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { ClassesModule } from '../classes/classes.module';
import { SchoolConfigModule } from '../school-config/school-config.module';
import { TaskGrade } from '../tasks/entities/task-grade.entity';
import { Task } from '../tasks/entities/task.entity';
import { UsersModule } from '../users/users.module';
import { ParentStudentLink } from '../users/entities/parent-student-link.entity';
import { User } from '../users/entities/user.entity';
import { GradesController } from './grades.controller';
import { ClassGradeConfig } from './entities/class-grade-config.entity';
import { GradeRecord } from './entities/grade-record.entity';
import { GradesService } from './grades.service';
import {
  ClassGradeConfigsRepository,
  GradeAttendanceRecordsRepository,
  GradeParentLinksRepository,
  GradeRecordsRepository,
  GradeTaskGradesRepository,
  GradeTasksRepository,
  GradeUsersRepository
} from './repositories';

@Module({
  imports: [
    TypeOrmModule.forFeature([GradeRecord, ParentStudentLink, ClassGradeConfig, Task, TaskGrade, User, AttendanceRecord]),
    ClassesModule,
    UsersModule,
    SchoolConfigModule,
    AcademicCyclesModule
  ],
  controllers: [GradesController],
  providers: [
    GradesService,
    GradeRecordsRepository,
    GradeParentLinksRepository,
    GradeAttendanceRecordsRepository,
    ClassGradeConfigsRepository,
    GradeTasksRepository,
    GradeTaskGradesRepository,
    GradeUsersRepository
  ],
  exports: [GradesService]
})
export class GradesModule {}
