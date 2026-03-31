import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicCycle } from '../academic-cycles/entities/academic-cycle.entity';
import { Grade } from '../academic-cycles/entities/grade.entity';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { SchoolClass } from '../classes/entities/class.entity';
import { Incident } from '../discipline/entities/incident.entity';
import { PdfGeneratorService } from '../documents/services/pdf-generator.service';
import { IssuedDocument } from '../documents/entities/issued-document.entity';
import { Enrollment } from '../enrollment/entities/enrollment.entity';
import { GradeRecord } from '../grades/entities/grade-record.entity';
import { GradesModule } from '../grades/grades.module';
import { SchoolConfigModule } from '../school-config/school-config.module';
import { SchoolsModule } from '../schools/schools.module';
import { Task } from '../tasks/entities/task.entity';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import {
  ReportsAcademicCyclesRepository,
  ReportsAcademicGradesRepository,
  ReportsAttendanceRepository,
  ReportsClassesRepository,
  ReportsEnrollmentsRepository,
  ReportsGradesRepository,
  ReportsIncidentsRepository,
  ReportsIssuedDocumentsRepository,
  ReportsTasksRepository,
  ReportsUsersRepository
} from './repositories';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AcademicCycle,
      Grade,
      AttendanceRecord,
      SchoolClass,
      Incident,
      IssuedDocument,
      Enrollment,
      GradeRecord,
      Task,
      User
    ]),
    GradesModule,
    SchoolsModule,
    SchoolConfigModule,
    UsersModule
  ],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportsAttendanceRepository,
    ReportsGradesRepository,
    ReportsTasksRepository,
    ReportsIncidentsRepository,
    ReportsClassesRepository,
    ReportsAcademicGradesRepository,
    ReportsAcademicCyclesRepository,
    ReportsUsersRepository,
    ReportsEnrollmentsRepository,
    ReportsIssuedDocumentsRepository,
    PdfGeneratorService
  ],
  exports: [ReportsService]
})
export class ReportsModule {}
