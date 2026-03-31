import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassesModule } from '../classes/classes.module';
import { StorageService } from '../common/services/storage.service';
import { UsersController } from './users.controller';
import { SchoolInvitation } from './entities/school-invitation.entity';
import { User } from './entities/user.entity';
import { ParentStudentLink } from './entities/parent-student-link.entity';
import { SchoolMembership } from './entities/school-membership.entity';
import { StudentClassAssignment } from './entities/student-class-assignment.entity';
import { UsersService } from './users.service';
import {
  ParentStudentLinksRepository,
  SchoolInvitationsRepository,
  SchoolMembershipsRepository,
  StudentClassAssignmentsRepository,
  UsersRepository
} from './repositories';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User, ParentStudentLink, StudentClassAssignment, SchoolMembership, SchoolInvitation]),
    forwardRef(() => ClassesModule)
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersRepository,
    ParentStudentLinksRepository,
    StudentClassAssignmentsRepository,
    SchoolMembershipsRepository,
    SchoolInvitationsRepository,
    StorageService
  ],
  exports: [UsersService, TypeOrmModule]
})
export class UsersModule {}
