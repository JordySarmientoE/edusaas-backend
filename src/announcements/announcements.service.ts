import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { In } from 'typeorm';
import { ClassesService } from '../classes/classes.service';
import { PaginatedResultDto } from '../common/dto/paginated-result.dto';
import { Role } from '../common/enums/role.enum';
import { paginate } from '../common/helpers/paginate.helper';
import { StorageService } from '../common/services/storage.service';
import { UsersService } from '../users/users.service';
import { AnnouncementCommentDto } from './dto/announcement-comment.dto';
import { AnnouncementFiltersDto } from './dto/announcement-filters.dto';
import { CreateAnnouncementCommentDto } from './dto/create-announcement-comment.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { ParentAnnouncementDto } from './dto/parent-announcement.dto';
import { StudentAnnouncementDto } from './dto/student-announcement.dto';
import { UpdateAnnouncementCommentDto } from './dto/update-announcement-comment.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AnnouncementComment } from './entities/announcement-comment.entity';
import { Announcement } from './entities/announcement.entity';
import {
  AnnouncementParentLinksRepository,
  AnnouncementCommentsRepository,
  AnnouncementsRepository,
  AnnouncementStudentAssignmentsRepository,
  AnnouncementUsersRepository
} from './repositories';

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly announcementsRepository: AnnouncementsRepository,
    private readonly studentAssignmentsRepository: AnnouncementStudentAssignmentsRepository,
    private readonly parentStudentLinksRepository: AnnouncementParentLinksRepository,
    private readonly announcementCommentsRepository: AnnouncementCommentsRepository,
    private readonly announcementUsersRepository: AnnouncementUsersRepository,
    private readonly classesService: ClassesService,
    private readonly storageService: StorageService,
    private readonly usersService: UsersService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async createAnnouncement(
    dto: CreateAnnouncementDto,
    schoolId: string,
    teacherId?: string,
    files: Array<{ originalname: string; buffer: Buffer; mimetype?: string }> = []
  ): Promise<Announcement> {
    await this.classesService.findById(dto.classId, schoolId);
    const storedAttachments = await Promise.all(
      files.map((file) => this.storageService.storeAttachment(file, 'announcements'))
    );
    const primaryAttachment = storedAttachments[0] ?? null;
    const announcement = this.announcementsRepository.create({
      schoolId,
      classId: dto.classId,
      teacherId: teacherId ?? null,
      title: dto.title.trim(),
      message: dto.message.trim(),
      type: dto.type,
      linkUrl: dto.linkUrl?.trim() || null,
      attachmentUrl: primaryAttachment?.url ?? null,
      attachmentName: primaryAttachment?.name ?? null,
      attachmentMimeType: primaryAttachment?.mimeType ?? null,
      attachmentStorageKey: primaryAttachment?.key ?? null,
      attachments: storedAttachments
    });

    const saved = await this.announcementsRepository.save(announcement);
    this.eventEmitter.emit('announcement.created', {
      schoolId,
      classId: saved.classId,
      announcementId: saved.id,
      title: saved.title,
      type: saved.type
    });
    return saved;
  }

  async findByClass(classId: string, schoolId: string, filters: AnnouncementFiltersDto): Promise<PaginatedResultDto<Announcement>> {
    await this.classesService.findById(classId, schoolId);
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const query = this.announcementsRepository
      .createQueryBuilder('announcement')
      .where('announcement.schoolId = :schoolId', { schoolId })
      .andWhere('announcement.classId = :classId', { classId })
      .orderBy('announcement.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await query.getManyAndCount();
    return paginate(data, total, page, limit);
  }

  async findByStudent(studentId: string, schoolId: string): Promise<StudentAnnouncementDto[]> {
    await this.usersService.findById(studentId, schoolId);
    const classes = await this.classesService.findStudentClasses(studentId, schoolId);
    const classIds = [...new Set(classes.map((item) => item.id))];

    if (classIds.length === 0) {
      return [];
    }

    const announcements = await this.announcementsRepository.find({
      where: { schoolId, classId: In(classIds) },
      order: { createdAt: 'DESC' }
    });

    return announcements.map((item) => ({
      id: item.id,
      classId: item.classId,
      title: item.title,
      message: item.message,
      type: item.type,
      linkUrl: item.linkUrl,
      attachmentUrl: item.attachmentUrl,
      attachmentName: item.attachmentName,
      attachmentMimeType: item.attachmentMimeType,
      attachments: item.attachments ?? [],
      createdAt: item.createdAt
    }));
  }

  async findByParent(parentId: string, schoolId: string): Promise<ParentAnnouncementDto[]> {
    await this.usersService.findById(parentId, schoolId);
    await this.usersService.ensureUserCanAccessLinkedStudentsInSchool(parentId, schoolId);

    const linkedStudents = await this.usersService.getLinkedStudentsForParent(parentId, schoolId);
    if (linkedStudents.length === 0) {
      return [];
    }

    const classIds = [...new Set(linkedStudents.flatMap((student) => student.classIds))];
    if (classIds.length === 0) {
      return [];
    }

    const announcements = await this.announcementsRepository.find({
      where: { schoolId, classId: In(classIds) },
      order: { createdAt: 'DESC' }
    });

    const studentsByClassId = new Map<string, typeof linkedStudents>();
    for (const student of linkedStudents) {
      for (const classId of student.classIds) {
        const current = studentsByClassId.get(classId) ?? [];
        current.push(student);
        studentsByClassId.set(classId, current);
      }
    }

    return announcements.flatMap((item) =>
      (studentsByClassId.get(item.classId) ?? []).map((student) => ({
        id: item.id,
        classId: item.classId,
        title: item.title,
        message: item.message,
        type: item.type,
        linkUrl: item.linkUrl,
        attachmentUrl: item.attachmentUrl,
        attachmentName: item.attachmentName,
        attachmentMimeType: item.attachmentMimeType,
        attachments: item.attachments ?? [],
        createdAt: item.createdAt,
        studentId: student.id,
        studentFirstName: student.firstName,
        studentLastName: student.lastName
      }))
    );
  }

  async updateAnnouncement(
    id: string,
    dto: UpdateAnnouncementDto,
    schoolId: string,
    files: Array<{ originalname: string; buffer: Buffer; mimetype?: string }> = []
  ): Promise<Announcement> {
    const announcement = await this.findById(id, schoolId);
    const storedAttachments = await Promise.all(
      files.map((file) => this.storageService.storeAttachment(file, 'announcements'))
    );
    const currentAttachments = announcement.attachments ?? [];
    const keptAttachments =
      dto.keepAttachmentKeys === undefined
        ? currentAttachments
        : currentAttachments.filter((attachment) => dto.keepAttachmentKeys?.includes(attachment.key));

    if (dto.classId && dto.classId !== announcement.classId) {
      await this.classesService.findById(dto.classId, schoolId);
      announcement.classId = dto.classId;
    }

    if (dto.title !== undefined) {
      announcement.title = dto.title.trim();
    }

    if (dto.message !== undefined) {
      announcement.message = dto.message.trim();
    }

    if (dto.type !== undefined) {
      announcement.type = dto.type;
    }

    if (dto.linkUrl !== undefined) {
      announcement.linkUrl = dto.linkUrl?.trim() || null;
    }

    const mergedAttachments = [...keptAttachments, ...storedAttachments];
    const primaryAttachment = mergedAttachments[0] ?? null;
    announcement.attachments = mergedAttachments;
    announcement.attachmentUrl = primaryAttachment?.url ?? null;
    announcement.attachmentName = primaryAttachment?.name ?? null;
    announcement.attachmentMimeType = primaryAttachment?.mimeType ?? null;
    announcement.attachmentStorageKey = primaryAttachment?.key ?? null;

    return this.announcementsRepository.save(announcement);
  }

  async getComments(announcementId: string, userId: string, schoolId: string): Promise<AnnouncementCommentDto[]> {
    const announcement = await this.findById(announcementId, schoolId);
    await this.ensureCanViewAnnouncement(announcement, userId, schoolId);

    const comments = await this.announcementCommentsRepository.find({
      where: { schoolId, announcementId },
      relations: { user: true },
      order: { createdAt: 'ASC' }
    });

    return comments.map((comment) => ({
      id: comment.id,
      announcementId: comment.announcementId,
      userId: comment.userId,
      firstName: comment.user.firstName,
      lastName: comment.user.lastName,
      email: comment.user.email,
      role: comment.user.role,
      message: comment.message,
      createdAt: comment.createdAt
    }));
  }

  async createComment(
    announcementId: string,
    dto: CreateAnnouncementCommentDto,
    userId: string,
    schoolId: string
  ): Promise<AnnouncementCommentDto> {
    const announcement = await this.findById(announcementId, schoolId);
    const role = await this.ensureCanCommentOnAnnouncement(announcement, userId, schoolId);
    const user = await this.usersService.findById(userId, schoolId);

    const comment = this.announcementCommentsRepository.create({
      schoolId,
      announcementId,
      userId,
      message: dto.message.trim()
    });

    const saved = await this.announcementCommentsRepository.save(comment);

    this.eventEmitter.emit('announcement.comment.created', {
      schoolId,
      announcementId,
      classId: announcement.classId,
      title: announcement.title,
      authorId: userId,
      authorRole: role,
      authorName: `${user.firstName} ${user.lastName}`
    });

    return {
      id: saved.id,
      announcementId: saved.announcementId,
      userId: saved.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      message: saved.message,
      createdAt: saved.createdAt
    };
  }

  async updateComment(
    commentId: string,
    dto: UpdateAnnouncementCommentDto,
    userId: string,
    schoolId: string
  ): Promise<AnnouncementCommentDto> {
    const comment = await this.findCommentById(commentId, schoolId);
    const role = await this.usersService.getRoleForUserInSchool(userId, schoolId);

    if (role !== Role.SCHOOL_ADMIN && comment.userId !== userId) {
      throw new ForbiddenException('No puedes editar comentarios de otro usuario');
    }

    if (dto.message !== undefined) {
      comment.message = dto.message.trim();
    }

    const saved = await this.announcementCommentsRepository.save(comment);
    const user = await this.usersService.findById(saved.userId, schoolId);

    return {
      id: saved.id,
      announcementId: saved.announcementId,
      userId: saved.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      message: saved.message,
      createdAt: saved.createdAt
    };
  }

  async deleteComment(commentId: string, userId: string, schoolId: string): Promise<void> {
    const comment = await this.findCommentById(commentId, schoolId);
    const role = await this.usersService.getRoleForUserInSchool(userId, schoolId);

    if (role !== Role.SCHOOL_ADMIN && comment.userId !== userId) {
      throw new ForbiddenException('No puedes eliminar comentarios de otro usuario');
    }

    await this.announcementCommentsRepository.remove(comment);
  }

  async deleteAnnouncement(id: string, schoolId: string): Promise<void> {
    const announcement = await this.findById(id, schoolId);
    await this.announcementsRepository.remove(announcement);
  }

  async findById(id: string, schoolId: string): Promise<Announcement> {
    const announcement = await this.announcementsRepository.findOne({
      where: { id, schoolId }
    });

    if (!announcement) {
      throw new NotFoundException('Aviso no encontrado');
    }

    return announcement;
  }

  private async findCommentById(commentId: string, schoolId: string): Promise<AnnouncementComment> {
    const comment = await this.announcementCommentsRepository.findOne({
      where: { id: commentId, schoolId }
    });

    if (!comment) {
      throw new NotFoundException('Comentario no encontrado');
    }

    return comment;
  }

  private async ensureCanViewAnnouncement(announcement: Announcement, userId: string, schoolId: string): Promise<Role> {
    const role = await this.usersService.getRoleForUserInSchool(userId, schoolId);

    if (role === Role.SCHOOL_ADMIN) {
      return role;
    }

    if (role === Role.TEACHER) {
      const ownsClass = await this.classesService.teacherOwnsClass(announcement.classId, userId, schoolId);
      if (ownsClass) {
        return role;
      }
      throw new BadRequestException('No tienes acceso a este aviso');
    }

    if (role === Role.STUDENT) {
      const hasAccess = await this.classesService.studentHasClassAccess(announcement.classId, userId, schoolId);
      if (hasAccess) {
        return role;
      }
      throw new BadRequestException('No tienes acceso a este aviso');
    }

    if (role === Role.PARENT) {
      const linkedStudents = await this.usersService.getLinkedStudentsForParent(userId, schoolId);
      if (linkedStudents.some((student) => student.classIds.includes(announcement.classId))) {
        return role;
      }
    }

    throw new BadRequestException('No tienes acceso a este aviso');
  }

  private async ensureCanCommentOnAnnouncement(announcement: Announcement, userId: string, schoolId: string): Promise<Role> {
    const role = await this.ensureCanViewAnnouncement(announcement, userId, schoolId);

    if (role === Role.PARENT) {
      throw new BadRequestException('Los padres solo pueden ver los comentarios');
    }

    if (role !== Role.TEACHER && role !== Role.STUDENT && role !== Role.SCHOOL_ADMIN) {
      throw new BadRequestException('No tienes permiso para comentar');
    }

    return role;
  }
}
