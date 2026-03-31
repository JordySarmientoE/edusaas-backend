import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SchoolClass } from '../classes/entities/class.entity';
import { TypeOrmRepository } from '../common/repositories/typeorm.repository';
import { ParentStudentLink } from '../users/entities/parent-student-link.entity';
import { StudentClassAssignment } from '../users/entities/student-class-assignment.entity';
import { User } from '../users/entities/user.entity';
import { AnnouncementComment } from './entities/announcement-comment.entity';
import { Announcement } from './entities/announcement.entity';

@Injectable()
export class AnnouncementsRepository extends TypeOrmRepository<Announcement> {
  constructor(dataSource: DataSource) {
    super(Announcement, dataSource);
  }
}

@Injectable()
export class AnnouncementStudentAssignmentsRepository extends TypeOrmRepository<StudentClassAssignment> {
  constructor(dataSource: DataSource) {
    super(StudentClassAssignment, dataSource);
  }
}

@Injectable()
export class AnnouncementParentLinksRepository extends TypeOrmRepository<ParentStudentLink> {
  constructor(dataSource: DataSource) {
    super(ParentStudentLink, dataSource);
  }
}

@Injectable()
export class AnnouncementClassesRepository extends TypeOrmRepository<SchoolClass> {
  constructor(dataSource: DataSource) {
    super(SchoolClass, dataSource);
  }
}

@Injectable()
export class AnnouncementCommentsRepository extends TypeOrmRepository<AnnouncementComment> {
  constructor(dataSource: DataSource) {
    super(AnnouncementComment, dataSource);
  }
}

@Injectable()
export class AnnouncementUsersRepository extends TypeOrmRepository<User> {
  constructor(dataSource: DataSource) {
    super(User, dataSource);
  }
}
