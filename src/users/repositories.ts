import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepository } from '../common/repositories/typeorm.repository';
import { ParentStudentLink } from './entities/parent-student-link.entity';
import { SchoolInvitation } from './entities/school-invitation.entity';
import { SchoolMembership } from './entities/school-membership.entity';
import { StudentClassAssignment } from './entities/student-class-assignment.entity';
import { User } from './entities/user.entity';

@Injectable()
export class UsersRepository extends TypeOrmRepository<User> {
  constructor(dataSource: DataSource) {
    super(User, dataSource);
  }
}

@Injectable()
export class ParentStudentLinksRepository extends TypeOrmRepository<ParentStudentLink> {
  constructor(dataSource: DataSource) {
    super(ParentStudentLink, dataSource);
  }
}

@Injectable()
export class StudentClassAssignmentsRepository extends TypeOrmRepository<StudentClassAssignment> {
  constructor(dataSource: DataSource) {
    super(StudentClassAssignment, dataSource);
  }
}

@Injectable()
export class SchoolMembershipsRepository extends TypeOrmRepository<SchoolMembership> {
  constructor(dataSource: DataSource) {
    super(SchoolMembership, dataSource);
  }
}

@Injectable()
export class SchoolInvitationsRepository extends TypeOrmRepository<SchoolInvitation> {
  constructor(dataSource: DataSource) {
    super(SchoolInvitation, dataSource);
  }
}
