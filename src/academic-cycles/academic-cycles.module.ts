import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolsModule } from '../schools/schools.module';
import { AcademicCyclesController } from './academic-cycles.controller';
import { AcademicCyclesService } from './academic-cycles.service';
import { AcademicCycle } from './entities/academic-cycle.entity';
import { Course } from './entities/course.entity';
import { GradeCourseConfig } from './entities/grade-course-config.entity';
import { Grade } from './entities/grade.entity';
import { Section } from './entities/section.entity';
import {
  AcademicCoursesRepository,
  AcademicCyclesRepository,
  AcademicGradesRepository,
  AcademicSectionsRepository,
  GradeCourseConfigsRepository
} from './repositories';

@Module({
  imports: [TypeOrmModule.forFeature([AcademicCycle, Grade, Section, Course, GradeCourseConfig]), SchoolsModule],
  controllers: [AcademicCyclesController],
  providers: [
    AcademicCyclesService,
    AcademicCyclesRepository,
    AcademicGradesRepository,
    AcademicSectionsRepository,
    AcademicCoursesRepository,
    GradeCourseConfigsRepository
  ],
  exports: [AcademicCyclesService, TypeOrmModule]
})
export class AcademicCyclesModule {}
