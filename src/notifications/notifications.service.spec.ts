import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { ParentStudentLink } from '../users/entities/parent-student-link.entity';
import { StudentClassAssignment } from '../users/entities/student-class-assignment.entity';
import { AttendanceStatus } from '../attendance/entities/attendance-record.entity';
import { Notification } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';
import {
  NotificationClassesRepository,
  NotificationParentLinksRepository,
  NotificationTaskGradesRepository,
  NotificationTasksRepository,
  NotificationUsersRepository,
  NotificationsRepository,
  NotificationStudentAssignmentsRepository
} from './repositories';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationsRepository: jest.Mocked<Repository<Notification>>;
  let studentAssignmentsRepository: { find: jest.Mock };
  let parentLinksRepository: { find: jest.Mock; createQueryBuilder: jest.Mock };
  let usersRepository: { find: jest.Mock; findOne: jest.Mock };
  let classesRepository: { findOne: jest.Mock };
  let taskGradesRepository: { find: jest.Mock };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: NotificationsRepository,
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn()
          }
        },
        {
          provide: NotificationStudentAssignmentsRepository,
          useValue: {
            find: jest.fn()
          }
        },
        {
          provide: NotificationParentLinksRepository,
          useValue: {
            find: jest.fn(),
            createQueryBuilder: jest.fn()
          }
        },
        {
          provide: NotificationUsersRepository,
          useValue: {
            find: jest.fn(),
            findOne: jest.fn()
          }
        },
        {
          provide: NotificationClassesRepository,
          useValue: {
            findOne: jest.fn()
          }
        },
        {
          provide: NotificationTasksRepository,
          useValue: {
            findOne: jest.fn()
          }
        },
        {
          provide: NotificationTaskGradesRepository,
          useValue: {
            find: jest.fn()
          }
        }
      ]
    }).compile();

    service = moduleRef.get(NotificationsService);
    notificationsRepository = moduleRef.get(NotificationsRepository);
    studentAssignmentsRepository = moduleRef.get(NotificationStudentAssignmentsRepository);
    parentLinksRepository = moduleRef.get(NotificationParentLinksRepository);
    usersRepository = moduleRef.get(NotificationUsersRepository);
    classesRepository = moduleRef.get(NotificationClassesRepository);
    taskGradesRepository = moduleRef.get(NotificationTaskGradesRepository);
  });

  it('creates notifications', async () => {
    notificationsRepository.create.mockReturnValue({ title: 'Nueva tarea' } as Notification);
    notificationsRepository.save.mockResolvedValue({ id: 'notif-1' } as Notification);

    const result = await service.createNotification({
      schoolId: 'school-1',
      userId: 'user-1',
      title: 'Nueva tarea',
      message: 'Se publicó una tarea'
    });

    expect(result.id).toBe('notif-1');
  });

  it('marks notification as read', async () => {
    notificationsRepository.findOne.mockResolvedValue({ id: 'notif-1', isRead: false } as Notification);
    await service.markAsRead('notif-1', 'user-1');
    expect(notificationsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ isRead: true })
    );
  });

  it('throws when notification is missing', async () => {
    notificationsRepository.findOne.mockResolvedValue(null);
    await expect(service.markAsRead('missing', 'user-1')).rejects.toThrow(NotFoundException);
  });

  it('marks all unread notifications as read', async () => {
    notificationsRepository.find.mockResolvedValue([
      { id: 'n1', isRead: false },
      { id: 'n2', isRead: false }
    ] as never);

    await service.markAllAsRead('user-1');

    expect(notificationsRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ isRead: true }),
      expect.objectContaining({ isRead: true })
    ]);
  });

  it('creates task notifications for students and parents', async () => {
    studentAssignmentsRepository.find.mockResolvedValue([
      { studentId: 'student-1' }
    ] as never);
    parentLinksRepository.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ parentId: 'parent-1', studentId: 'student-1' }])
    });
    classesRepository.findOne.mockResolvedValue({ displayName: 'Matemática 1A' });
    usersRepository.find.mockResolvedValue([{ id: 'student-1', firstName: 'Ana', lastName: 'Pérez' }] as never);
    const createSpy = jest.spyOn(service, 'createNotification').mockResolvedValue({} as Notification);

    await service.handleTaskCreatedEvent({
      schoolId: 'school-1',
      classId: 'class-1',
      taskId: 'task-1',
      title: 'Práctica 1',
      taskType: 'practice'
    });

    expect(createSpy).toHaveBeenCalledTimes(2);
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'student-1',
        type: 'task_created'
      })
    );
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'parent-1',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        metadata: expect.objectContaining({ studentName: 'Ana Pérez' })
      })
    );
  });

  it('creates incident and attendance notifications', async () => {
    parentLinksRepository.find.mockResolvedValue([{ parentId: 'parent-1', studentId: 'student-1' }] as never);
    usersRepository.findOne.mockResolvedValue({ id: 'student-1', firstName: 'Ana', lastName: 'Pérez' } as never);
    classesRepository.findOne.mockResolvedValue({ name: 'Historia' } as never);
    usersRepository.find.mockResolvedValue([{ id: 'student-1', firstName: 'Ana', lastName: 'Pérez' }] as never);
    const createSpy = jest.spyOn(service, 'createNotification').mockResolvedValue({} as Notification);

    await service.handleIncidentCreatedEvent({
      schoolId: 'school-1',
      studentId: 'student-1',
      incidentId: 'incident-1',
      severity: 'severe',
      description: 'Pelea en recreo'
    });

    await service.handleAttendanceRecordedEvent({
      schoolId: 'school-1',
      classId: 'class-1',
      attendanceDate: '2026-03-30',
      records: [{ studentId: 'student-1', status: AttendanceStatus.ABSENT }]
    });

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'incident_created',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        metadata: expect.objectContaining({ severity: 'severe' })
      })
    );
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'attendance_alert',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        metadata: expect.objectContaining({ attendanceDate: '2026-03-30' })
      })
    );
  });

  it('creates graded task notifications only for students with grades', async () => {
    classesRepository.findOne.mockResolvedValue({ displayName: 'Comunicación 2B' } as never);
    taskGradesRepository.find.mockResolvedValue([
      { studentId: 'student-1', scaledScore: '18', rawScore: 18 }
    ] as never);
    usersRepository.find.mockResolvedValue([{ id: 'student-1', firstName: 'Luis', lastName: 'Rojas' }] as never);
    parentLinksRepository.find.mockResolvedValue([{ parentId: 'parent-1', studentId: 'student-1' }] as never);
    const createSpy = jest.spyOn(service, 'createNotification').mockResolvedValue({} as Notification);

    await service.handleTaskGradedEvent({
      schoolId: 'school-1',
      taskId: 'task-1',
      classId: 'class-1',
      title: 'Examen mensual',
      taskType: 'exam',
      studentIds: ['student-1']
    });

    expect(createSpy).toHaveBeenCalledTimes(2);
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'task_graded',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        metadata: expect.objectContaining({ scaledScore: '18', studentName: 'Luis Rojas' })
      })
    );
  });
});
