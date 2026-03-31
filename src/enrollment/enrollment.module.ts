import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicCyclesModule } from '../academic-cycles/academic-cycles.module';
import { UsersModule } from '../users/users.module';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';
import { Enrollment } from './entities/enrollment.entity';
import { EnrollmentsRepository } from './repositories';

@Module({
  imports: [TypeOrmModule.forFeature([Enrollment]), UsersModule, AcademicCyclesModule],
  controllers: [EnrollmentController],
  providers: [EnrollmentService, EnrollmentsRepository],
  exports: [EnrollmentService]
})
export class EnrollmentModule {}
