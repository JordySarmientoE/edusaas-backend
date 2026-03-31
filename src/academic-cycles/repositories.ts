import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepository } from '../common/repositories/typeorm.repository';
import { Course } from './entities/course.entity';
import { GradeCourseConfig } from './entities/grade-course-config.entity';
import { AcademicCycle } from './entities/academic-cycle.entity';
import { Grade } from './entities/grade.entity';
import { Section } from './entities/section.entity';

@Injectable()
export class AcademicCyclesRepository extends TypeOrmRepository<AcademicCycle> {
  constructor(dataSource: DataSource) {
    super(AcademicCycle, dataSource);
  }
}

@Injectable()
export class AcademicGradesRepository extends TypeOrmRepository<Grade> {
  constructor(dataSource: DataSource) {
    super(Grade, dataSource);
  }
}

@Injectable()
export class AcademicSectionsRepository extends TypeOrmRepository<Section> {
  constructor(dataSource: DataSource) {
    super(Section, dataSource);
  }
}

@Injectable()
export class AcademicCoursesRepository extends TypeOrmRepository<Course> {
  constructor(dataSource: DataSource) {
    super(Course, dataSource);
  }
}

@Injectable()
export class GradeCourseConfigsRepository extends TypeOrmRepository<GradeCourseConfig> {
  constructor(dataSource: DataSource) {
    super(GradeCourseConfig, dataSource);
  }
}
