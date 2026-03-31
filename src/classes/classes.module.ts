import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicCyclesModule } from '../academic-cycles/academic-cycles.module';
import { UsersModule } from '../users/users.module';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { SchoolClass } from './entities/class.entity';
import { Schedule } from './entities/schedule.entity';
import { SchedulesRepository, SchoolClassesRepository } from './repositories';
import { Course } from '../academic-cycles/entities/course.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SchoolClass, Schedule, Course]),
    forwardRef(() => AcademicCyclesModule),
    forwardRef(() => UsersModule)
  ],
  controllers: [ClassesController],
  providers: [ClassesService, SchoolClassesRepository, SchedulesRepository],
  exports: [ClassesService, TypeOrmModule]
})
export class ClassesModule {}
