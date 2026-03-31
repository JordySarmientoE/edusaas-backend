import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassesModule } from '../classes/classes.module';
import { StorageService } from '../common/services/storage.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { ParentStudentLink } from '../users/entities/parent-student-link.entity';
import { StudentClassAssignment } from '../users/entities/student-class-assignment.entity';
import { User } from '../users/entities/user.entity';
import { AnnouncementComment } from './entities/announcement-comment.entity';
import { Announcement } from './entities/announcement.entity';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';
import {
  AnnouncementClassesRepository,
  AnnouncementCommentsRepository,
  AnnouncementParentLinksRepository,
  AnnouncementsRepository,
  AnnouncementStudentAssignmentsRepository,
  AnnouncementUsersRepository
} from './repositories';

@Module({
  imports: [
    TypeOrmModule.forFeature([Announcement, AnnouncementComment, StudentClassAssignment, ParentStudentLink, User]),
    ClassesModule,
    UsersModule,
    NotificationsModule
  ],
  controllers: [AnnouncementsController],
  providers: [
    AnnouncementsService,
    StorageService,
    AnnouncementsRepository,
    AnnouncementStudentAssignmentsRepository,
    AnnouncementParentLinksRepository,
    AnnouncementClassesRepository,
    AnnouncementCommentsRepository,
    AnnouncementUsersRepository
  ],
  exports: [AnnouncementsService]
})
export class AnnouncementsModule {}
