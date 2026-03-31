import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassesModule } from '../classes/classes.module';
import { UsersModule } from '../users/users.module';
import { ParentStudentLink } from '../users/entities/parent-student-link.entity';
import { StudentClassAssignment } from '../users/entities/student-class-assignment.entity';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceRecord } from './entities/attendance-record.entity';
import {
  AttendanceParentLinksRepository,
  AttendanceRecordsRepository,
  AttendanceStudentAssignmentsRepository
} from './repositories';

@Module({
  imports: [
    TypeOrmModule.forFeature([AttendanceRecord, StudentClassAssignment, ParentStudentLink]),
    ClassesModule,
    UsersModule
  ],
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    AttendanceRecordsRepository,
    AttendanceStudentAssignmentsRepository,
    AttendanceParentLinksRepository
  ],
  exports: [AttendanceService]
})
export class AttendanceModule {}
