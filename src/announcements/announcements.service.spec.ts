import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { ClassesService } from '../classes/classes.service';
import { StorageService } from '../common/services/storage.service';
import { Role } from '../common/enums/role.enum';
import { UsersService } from '../users/users.service';
import { AnnouncementComment } from './entities/announcement-comment.entity';
import { Announcement, AnnouncementType } from './entities/announcement.entity';
import { AnnouncementsService } from './announcements.service';
import {
  AnnouncementCommentsRepository,
  AnnouncementParentLinksRepository,
  AnnouncementsRepository,
  AnnouncementStudentAssignmentsRepository,
  AnnouncementUsersRepository
} from './repositories';

describe('AnnouncementsService', () => {
  let service: AnnouncementsService;
  let announcementsRepository: jest.Mocked<Repository<Announcement>>;
  let commentsRepository: jest.Mocked<Repository<AnnouncementComment>>;
  let usersService: jest.Mocked<UsersService>;
  let classesService: {
    findById: jest.Mock;
    findStudentClasses: jest.Mock;
    teacherOwnsClass: jest.Mock;
    studentHasClassAccess: jest.Mock;
  };
  let storageService: {
    storeAttachment: jest.Mock;
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AnnouncementsService,
        {
          provide: AnnouncementsRepository,
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn()
          }
        },
        {
          provide: AnnouncementStudentAssignmentsRepository,
          useValue: {
            find: jest.fn()
          }
        },
        {
          provide: AnnouncementParentLinksRepository,
          useValue: {
            find: jest.fn()
          }
        },
        {
          provide: AnnouncementCommentsRepository,
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn()
          }
        },
        {
          provide: AnnouncementUsersRepository,
          useValue: {
            find: jest.fn()
          }
        },
        {
          provide: ClassesService,
          useValue: {
            findById: jest.fn().mockResolvedValue({ id: 'class-1' }),
            findStudentClasses: jest.fn(),
            teacherOwnsClass: jest.fn(),
            studentHasClassAccess: jest.fn()
          }
        },
        {
          provide: StorageService,
          useValue: {
            storeAttachment: jest.fn()
          }
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(),
            ensureUserCanAccessLinkedStudentsInSchool: jest.fn(),
            getLinkedStudentsForParent: jest.fn(),
            getRoleForUserInSchool: jest.fn()
          }
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn()
          }
        }
      ]
    }).compile();

    service = moduleRef.get(AnnouncementsService);
    announcementsRepository = moduleRef.get(AnnouncementsRepository);
    commentsRepository = moduleRef.get(AnnouncementCommentsRepository);
    usersService = moduleRef.get(UsersService);
    classesService = moduleRef.get(ClassesService);
    storageService = moduleRef.get(StorageService);
  });

  it('creates an announcement and trims fields', async () => {
    announcementsRepository.create.mockImplementation((value) => value as never);
    announcementsRepository.save.mockResolvedValue({
      id: 'announcement-1',
      classId: 'class-1',
      title: 'Aviso',
      type: AnnouncementType.ANNOUNCEMENT
    } as never);

    const result = await service.createAnnouncement(
      {
        classId: 'class-1',
        title: '  Aviso ',
        message: ' Mensaje ',
        type: AnnouncementType.ANNOUNCEMENT,
        linkUrl: ' https://demo.test '
      },
      'school-1',
      'teacher-1'
    );

    expect(announcementsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Aviso',
        message: 'Mensaje',
        linkUrl: 'https://demo.test'
      })
    );
    expect(result.id).toBe('announcement-1');
  });

  it('returns empty arrays when student or parent have no classes', async () => {
    classesService.findStudentClasses.mockResolvedValue([]);
    usersService.findById.mockResolvedValue({ id: 'student-1' } as never);
    usersService.ensureUserCanAccessLinkedStudentsInSchool.mockResolvedValue(Role.PARENT as never);
    usersService.getLinkedStudentsForParent.mockResolvedValue([{ id: 'student-1', classIds: [] }] as never);

    await expect(service.findByStudent('student-1', 'school-1')).resolves.toEqual([]);
    await expect(service.findByParent('parent-1', 'school-1')).resolves.toEqual([]);
  });

  it('maps parent announcements per linked student', async () => {
    usersService.findById.mockResolvedValue({ id: 'parent-1' } as never);
    usersService.ensureUserCanAccessLinkedStudentsInSchool.mockResolvedValue(Role.PARENT as never);
    usersService.getLinkedStudentsForParent.mockResolvedValue([
      { id: 'student-1', firstName: 'Ana', lastName: 'Perez', classIds: ['class-1'] }
    ] as never);
    announcementsRepository.find.mockResolvedValue([
      {
        id: 'announcement-1',
        classId: 'class-1',
        title: 'Aviso',
        message: 'Mensaje',
        type: AnnouncementType.ANNOUNCEMENT,
        attachments: [],
        createdAt: new Date()
      }
    ] as never);

    const result = await service.findByParent('parent-1', 'school-1');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expect.objectContaining({ studentId: 'student-1', title: 'Aviso' }));
  });

  it('rejects parent comments and protects comment editing permissions', async () => {
    announcementsRepository.findOne.mockResolvedValue({ id: 'announcement-1', classId: 'class-1' } as never);
    usersService.getRoleForUserInSchool.mockResolvedValue(Role.PARENT as never);
    usersService.getLinkedStudentsForParent.mockResolvedValue([
      { id: 'student-1', classIds: ['class-1'] }
    ] as never);

    await expect(
      service.createComment('announcement-1', { message: 'hola' }, 'parent-1', 'school-1')
    ).rejects.toThrow(BadRequestException);

    commentsRepository.findOne.mockResolvedValue({
      id: 'comment-1',
      schoolId: 'school-1',
      userId: 'author-1',
      announcementId: 'announcement-1',
      message: 'original'
    } as never);
    usersService.getRoleForUserInSchool.mockResolvedValue(Role.TEACHER as never);

    await expect(
      service.updateComment('comment-1', { message: 'editado' }, 'teacher-2', 'school-1')
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws when deleting a missing announcement', async () => {
    announcementsRepository.findOne.mockResolvedValue(null);
    await expect(service.deleteAnnouncement('missing', 'school-1')).rejects.toThrow(NotFoundException);
  });

  it('returns paginated announcements by class', async () => {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[{ id: 'announcement-1' }], 1])
    };
    announcementsRepository.createQueryBuilder.mockReturnValue(queryBuilder as never);

    const result = await service.findByClass('class-1', 'school-1', { page: 1, limit: 10 });

    expect(result.total).toBe(1);
    expect(result.data[0].id).toBe('announcement-1');
  });

  it('updates announcements keeping selected attachments', async () => {
    announcementsRepository.findOne.mockResolvedValue({
      id: 'announcement-1',
      schoolId: 'school-1',
      classId: 'class-1',
      title: 'Aviso',
      message: 'Mensaje',
      type: AnnouncementType.ANNOUNCEMENT,
      attachments: [
        { key: 'keep-1', url: '/keep-1', name: 'keep-1.pdf', mimeType: 'application/pdf' },
        { key: 'drop-1', url: '/drop-1', name: 'drop-1.pdf', mimeType: 'application/pdf' }
      ]
    } as never);
    storageService.storeAttachment.mockResolvedValue({
      key: 'new-1',
      url: '/new-1',
      name: 'new-1.pdf',
      mimeType: 'application/pdf'
    });
    announcementsRepository.save.mockImplementation(async (value) => value as never);

    const result = await service.updateAnnouncement(
      'announcement-1',
      {
        title: '  Nuevo aviso ',
        keepAttachmentKeys: ['keep-1']
      },
      'school-1',
      [{ originalname: 'new-1.pdf', buffer: Buffer.from('x') }]
    );

    expect(result.title).toBe('Nuevo aviso');
    expect(result.attachments).toEqual([
      { key: 'keep-1', url: '/keep-1', name: 'keep-1.pdf', mimeType: 'application/pdf' },
      { key: 'new-1', url: '/new-1', name: 'new-1.pdf', mimeType: 'application/pdf' }
    ]);
  });

  it('returns comments for a teacher who owns the class', async () => {
    announcementsRepository.findOne.mockResolvedValue({
      id: 'announcement-1',
      schoolId: 'school-1',
      classId: 'class-1'
    } as never);
    usersService.getRoleForUserInSchool.mockResolvedValue(Role.TEACHER as never);
    classesService.teacherOwnsClass.mockResolvedValue(true);
    commentsRepository.find.mockResolvedValue([
      {
        id: 'comment-1',
        announcementId: 'announcement-1',
        userId: 'teacher-1',
        message: 'Hola',
        createdAt: new Date(),
        user: {
          firstName: 'Ana',
          lastName: 'Perez',
          email: 'ana@example.com',
          role: Role.TEACHER
        }
      }
    ] as never);

    const result = await service.getComments('announcement-1', 'teacher-1', 'school-1');

    expect(result[0]).toEqual(expect.objectContaining({ id: 'comment-1', firstName: 'Ana' }));
  });

  it('creates a comment for a student with access to the class', async () => {
    announcementsRepository.findOne.mockResolvedValue({
      id: 'announcement-1',
      schoolId: 'school-1',
      classId: 'class-1',
      title: 'Aviso'
    } as never);
    usersService.getRoleForUserInSchool.mockResolvedValue(Role.STUDENT as never);
    classesService.studentHasClassAccess.mockResolvedValue(true);
    usersService.findById.mockResolvedValue({
      id: 'student-1',
      firstName: 'Ana',
      lastName: 'Perez',
      email: 'ana@example.com',
      role: Role.STUDENT
    } as never);
    commentsRepository.create.mockImplementation((value) => value as never);
    commentsRepository.save.mockImplementation(async (value) => ({
      id: 'comment-1',
      createdAt: new Date(),
      ...value
    }) as never);

    const result = await service.createComment(
      'announcement-1',
      { message: '  Gracias  ' },
      'student-1',
      'school-1'
    );

    expect(result).toEqual(expect.objectContaining({ id: 'comment-1', message: 'Gracias' }));
  });

  it('allows school admin to delete a comment', async () => {
    commentsRepository.findOne.mockResolvedValue({
      id: 'comment-1',
      schoolId: 'school-1',
      userId: 'teacher-1'
    } as never);
    usersService.getRoleForUserInSchool.mockResolvedValue(Role.SCHOOL_ADMIN as never);

    await service.deleteComment('comment-1', 'admin-1', 'school-1');

    expect(commentsRepository.remove).toHaveBeenCalledWith(expect.objectContaining({ id: 'comment-1' }));
  });
});
