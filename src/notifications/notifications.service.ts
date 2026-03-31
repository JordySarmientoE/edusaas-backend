import { Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AttendanceStatus } from '../attendance/entities/attendance-record.entity';
import { In } from 'typeorm';
import { AnnouncementType } from '../announcements/entities/announcement.entity';
import { TaskType } from '../tasks/entities/task.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { Notification } from './entities/notification.entity';
import {
  NotificationClassesRepository,
  NotificationParentLinksRepository,
  NotificationTaskGradesRepository,
  NotificationTasksRepository,
  NotificationsRepository,
  NotificationStudentAssignmentsRepository,
  NotificationUsersRepository
} from './repositories';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly studentClassAssignmentsRepository: NotificationStudentAssignmentsRepository,
    private readonly parentStudentLinksRepository: NotificationParentLinksRepository,
    private readonly usersRepository: NotificationUsersRepository,
    private readonly classesRepository: NotificationClassesRepository,
    private readonly tasksRepository: NotificationTasksRepository,
    private readonly taskGradesRepository: NotificationTaskGradesRepository
  ) {}

  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationsRepository.create({
      schoolId: dto.schoolId,
      userId: dto.userId,
      title: dto.title,
      message: dto.message,
      isRead: false,
      type: dto.type ?? null,
      metadata: dto.metadata ?? {}
    });
    return this.notificationsRepository.save(notification);
  }

  private getTaskTypeLabel(taskType?: string | null) {
    switch (taskType) {
      case TaskType.EXAM:
        return 'Examen';
      case TaskType.PRACTICE:
        return 'Práctica';
      case TaskType.PROJECT:
        return 'Proyecto';
      case TaskType.PARTICIPATION:
        return 'Participación';
      case TaskType.OTHER:
        return 'Actividad';
      case TaskType.HOMEWORK:
      default:
        return 'Tarea';
    }
  }

  private getNotificationKindLabel(type?: string | null, metadata?: Record<string, unknown>) {
    switch (type) {
      case 'task_created':
        return this.getTaskTypeLabel(typeof metadata?.taskType === 'string' ? metadata.taskType : null);
      case 'task_graded':
        return 'Calificación';
      case 'announcement_created':
        return this.getAnnouncementTypeLabel(typeof metadata?.announcementType === 'string' ? metadata.announcementType : null);
      case 'announcement_comment':
        return 'Comentario';
      case 'incident_created':
        return 'Disciplina';
      case 'attendance_alert':
        return 'Asistencia';
      case 'document_issued':
        return 'Documento';
      default:
        return '';
    }
  }

  private getSeverityLabel(severity: string) {
    if (severity === 'severe') return 'grave';
    if (severity === 'moderate') return 'moderado';
    return 'leve';
  }

  private getAttendanceStatusLabel(status: AttendanceStatus | string) {
    const normalizedStatus = String(status);
    if (normalizedStatus === 'absent') return 'Ausente';
    if (normalizedStatus === 'late') return 'Tardanza';
    return 'Presente';
  }

  private getAnnouncementTypeLabel(type?: string | null) {
    switch (type) {
      case AnnouncementType.REMINDER:
        return 'Recordatorio';
      case AnnouncementType.MATERIAL:
        return 'Material';
      case AnnouncementType.LINK:
        return 'Enlace';
      case AnnouncementType.ANNOUNCEMENT:
      default:
        return 'Aviso';
    }
  }

  async getByUser(userId: string, schoolId: string): Promise<Notification[]> {
    return this.notificationsRepository.find({
      where: { userId, schoolId },
      order: { createdAt: 'DESC' }
    });
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    const notification = await this.notificationsRepository.findOne({ where: { id, userId } });
    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }
    notification.isRead = true;
    await this.notificationsRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    const notifications = await this.notificationsRepository.find({ where: { userId, isRead: false } });
    for (const notification of notifications) {
      notification.isRead = true;
    }
    await this.notificationsRepository.save(notifications);
  }

  @OnEvent('task.created')
  async handleTaskCreatedEvent(payload: {
    schoolId: string;
    classId: string;
    taskId: string;
    title: string;
    taskType?: string;
  }): Promise<void> {
    const assignments = await this.studentClassAssignmentsRepository.find({
      where: { schoolId: payload.schoolId, classId: payload.classId }
    });

    if (assignments.length === 0) {
      return;
    }

    const studentIds = assignments.map((assignment) => assignment.studentId);
    const parentLinks = await this.parentStudentLinksRepository
      .createQueryBuilder('link')
      .where('link.schoolId = :schoolId', { schoolId: payload.schoolId })
      .andWhere('link.studentId IN (:...studentIds)', { studentIds })
      .getMany();

    const parentIds = parentLinks.map((link) => link.parentId);
    const targetUserIds = [...new Set([...studentIds, ...parentIds])];
    const [schoolClass, students] = await Promise.all([
      this.classesRepository.findOne({ where: { id: payload.classId, schoolId: payload.schoolId } }),
      this.usersRepository.find({ where: { id: In(studentIds) } })
    ]);
    const classLabel = schoolClass?.displayName || schoolClass?.name || 'curso';
    const studentsById = new Map(students.map((student) => [student.id, student]));
    const taskTypeLabel = this.getTaskTypeLabel(payload.taskType);

    await Promise.all(
      targetUserIds.map((userId) => {
        const parentLink = parentLinks.find((link) => link.parentId === userId);
        const child = parentLink ? studentsById.get(parentLink.studentId) : null;

        return (
        this.createNotification({
          schoolId: payload.schoolId,
          userId,
          title: `Nueva actividad: ${payload.title}`,
          message: child
            ? `${child.firstName} ${child.lastName} tiene ${taskTypeLabel.toLowerCase()} en ${classLabel}.`
            : `Se publicó ${taskTypeLabel.toLowerCase()} en ${classLabel}.`,
          type: 'task_created',
          metadata: {
            taskId: payload.taskId,
            classId: payload.classId,
            className: classLabel,
            taskType: payload.taskType ?? null,
            studentId: child?.id ?? null,
            studentName: child ? `${child.firstName} ${child.lastName}` : null
          }
        })
        );
      })
    );
  }

  @OnEvent('announcement.created')
  async handleAnnouncementCreatedEvent(payload: {
    schoolId: string;
    classId: string;
    announcementId: string;
    title: string;
    type?: string;
  }): Promise<void> {
    const assignments = await this.studentClassAssignmentsRepository.find({
      where: { schoolId: payload.schoolId, classId: payload.classId }
    });

    if (assignments.length === 0) {
      return;
    }

    const studentIds = assignments.map((assignment) => assignment.studentId);
    const parentLinks = await this.parentStudentLinksRepository
      .createQueryBuilder('link')
      .where('link.schoolId = :schoolId', { schoolId: payload.schoolId })
      .andWhere('link.studentId IN (:...studentIds)', { studentIds })
      .getMany();

    const parentIds = parentLinks.map((link) => link.parentId);
    const targetUserIds = [...new Set([...studentIds, ...parentIds])];
    const [schoolClass, students] = await Promise.all([
      this.classesRepository.findOne({ where: { id: payload.classId, schoolId: payload.schoolId } }),
      this.usersRepository.find({ where: { id: In(studentIds) } })
    ]);
    const classLabel = schoolClass?.displayName || schoolClass?.name || 'curso';
    const studentsById = new Map(students.map((student) => [student.id, student]));
    const typeLabel = this.getAnnouncementTypeLabel(payload.type);

    await Promise.all(
      targetUserIds.map((userId) => {
        const parentLink = parentLinks.find((link) => link.parentId === userId);
        const child = parentLink ? studentsById.get(parentLink.studentId) : null;

        return this.createNotification({
          schoolId: payload.schoolId,
          userId,
          title: `${typeLabel} publicado: ${payload.title}`,
          message: child
            ? `${child.firstName} ${child.lastName} tiene ${typeLabel.toLowerCase()} nuevo en ${classLabel}.`
            : `Se publicó ${typeLabel.toLowerCase()} en ${classLabel}.`,
          type: 'announcement_created',
          metadata: {
            announcementId: payload.announcementId,
            classId: payload.classId,
            className: classLabel,
            announcementType: payload.type ?? null,
            studentId: child?.id ?? null,
            studentName: child ? `${child.firstName} ${child.lastName}` : null
          }
        });
      })
    );
  }

  @OnEvent('incident.created')
  async handleIncidentCreatedEvent(payload: {
    schoolId: string;
    studentId: string;
    incidentId: string;
    severity: string;
    description?: string;
  }): Promise<void> {
    const parentLinks = await this.parentStudentLinksRepository.find({
      where: { schoolId: payload.schoolId, studentId: payload.studentId }
    });
    const student = await this.usersRepository.findOne({
      where: { id: payload.studentId }
    });
    const studentName = student ? `${student.firstName} ${student.lastName}` : 'El alumno';
    const severityLabel = this.getSeverityLabel(payload.severity);
    const shortDescription = payload.description?.trim()
      ? payload.description.trim().slice(0, 120)
      : null;
    const targetUserIds = [...new Set([payload.studentId, ...parentLinks.map((link) => link.parentId)])];

    await Promise.all(
      targetUserIds.map((userId) =>
        this.createNotification({
          schoolId: payload.schoolId,
          userId,
          title: 'Incidente disciplinario registrado',
          message:
            userId === payload.studentId
              ? `Se registró un incidente de nivel ${severityLabel}${shortDescription ? `: ${shortDescription}` : '.'}`
              : `Se registró un incidente de ${studentName} con nivel ${severityLabel}${shortDescription ? `: ${shortDescription}` : '.'}`,
          type: 'incident_created',
          metadata: {
            incidentId: payload.incidentId,
            studentId: payload.studentId,
            studentName,
            severity: payload.severity,
            description: payload.description ?? null
          }
        })
      )
    );
  }

  @OnEvent('document.issued')
  async handleDocumentIssuedEvent(payload: {
    schoolId: string;
    studentId: string;
    documentId: string;
    title: string;
  }): Promise<void> {
    const parentLinks = await this.parentStudentLinksRepository.find({
      where: { schoolId: payload.schoolId, studentId: payload.studentId }
    });

    const targetUserIds = [...new Set([payload.studentId, ...parentLinks.map((link) => link.parentId)])];

    await Promise.all(
      targetUserIds.map((userId) =>
        this.createNotification({
          schoolId: payload.schoolId,
          userId,
          title: `Documento emitido: ${payload.title}`,
          message: `Se generó el documento "${payload.title}"`,
          type: 'document_issued',
          metadata: {
            documentId: payload.documentId,
            studentId: payload.studentId
          }
        })
      )
    );
  }

  @OnEvent('task.graded')
  async handleTaskGradedEvent(payload: {
    schoolId: string;
    taskId: string;
    classId: string;
    title: string;
    taskType?: string;
    studentIds: string[];
  }): Promise<void> {
    const [schoolClass, taskGrades, students, parentLinks] = await Promise.all([
      this.classesRepository.findOne({ where: { id: payload.classId, schoolId: payload.schoolId } }),
      this.taskGradesRepository.find({
        where: {
          schoolId: payload.schoolId,
          taskId: payload.taskId,
          studentId: In(payload.studentIds)
        }
      }),
      this.usersRepository.find({ where: { id: In(payload.studentIds) } }),
      this.parentStudentLinksRepository.find({
        where: payload.studentIds.map((studentId) => ({ schoolId: payload.schoolId, studentId }))
      })
    ]);

    const classLabel = schoolClass?.displayName || schoolClass?.name || 'curso';
    const studentsById = new Map(students.map((student) => [student.id, student]));
    const taskTypeLabel = this.getTaskTypeLabel(payload.taskType);

    await Promise.all(
      taskGrades.flatMap((grade) => {
        const student = studentsById.get(grade.studentId);
        if (!student) {
          return [];
        }

        const parentIds = parentLinks.filter((link) => link.studentId === grade.studentId).map((link) => link.parentId);
        const userIds = [grade.studentId, ...parentIds];

        return userIds.map((userId) =>
          this.createNotification({
            schoolId: payload.schoolId,
            userId,
            title: `${taskTypeLabel} corregido: ${payload.title}`,
            message:
              userId === grade.studentId
                ? `Tu ${taskTypeLabel.toLowerCase()} ya fue calificado en ${classLabel}.`
                : `${student.firstName} ${student.lastName} ya tiene nota registrada en ${classLabel}.`,
            type: 'task_graded',
            metadata: {
              taskId: payload.taskId,
              classId: payload.classId,
              className: classLabel,
              taskType: payload.taskType ?? null,
              studentId: student.id,
              studentName: `${student.firstName} ${student.lastName}`,
              scaledScore: grade.scaledScore,
              rawScore: grade.rawScore
            }
          })
        );
      })
    );
  }

  @OnEvent('announcement.comment.created')
  async handleAnnouncementCommentCreatedEvent(payload: {
    schoolId: string;
    announcementId: string;
    classId: string;
    title: string;
    authorId: string;
    authorRole: string;
    authorName: string;
  }): Promise<void> {
    const [schoolClass, assignments, parentLinks, students] = await Promise.all([
      this.classesRepository.findOne({ where: { id: payload.classId, schoolId: payload.schoolId } }),
      this.studentClassAssignmentsRepository.find({
        where: { schoolId: payload.schoolId, classId: payload.classId }
      }),
      this.parentStudentLinksRepository.find({ where: { schoolId: payload.schoolId } }),
      this.usersRepository.find()
    ]);

    const classLabel = schoolClass?.displayName || schoolClass?.name || 'curso';
    const studentIds = assignments.map((assignment) => assignment.studentId);
    const relevantParentLinks = parentLinks.filter((link) => studentIds.includes(link.studentId));
    const usersById = new Map(students.map((user) => [user.id, user]));
    const targetUserIds = new Set<string>();

    if (payload.authorRole === 'teacher' || payload.authorRole === 'school_admin') {
      studentIds.forEach((id) => targetUserIds.add(id));
      relevantParentLinks.forEach((link) => targetUserIds.add(link.parentId));
    } else {
      if (schoolClass?.teacherId) {
        targetUserIds.add(schoolClass.teacherId);
      }
    }

    targetUserIds.delete(payload.authorId);

    await Promise.all(
      [...targetUserIds].map((userId) => {
        const childLink = relevantParentLinks.find((link) => link.parentId === userId);
        const child = childLink ? usersById.get(childLink.studentId) : null;

        return this.createNotification({
          schoolId: payload.schoolId,
          userId,
          title: `Nuevo comentario en aviso: ${payload.title}`,
          message: child
            ? `${payload.authorName} comentó sobre ${child.firstName} ${child.lastName} en ${classLabel}.`
            : `${payload.authorName} comentó en ${classLabel}.`,
          type: 'announcement_comment',
          metadata: {
            announcementId: payload.announcementId,
            classId: payload.classId,
            className: classLabel,
            authorId: payload.authorId,
            authorName: payload.authorName,
            authorRole: payload.authorRole,
            studentId: child?.id ?? null,
            studentName: child ? `${child.firstName} ${child.lastName}` : null
          }
        });
      })
    );
  }

  @OnEvent('attendance.recorded')
  async handleAttendanceRecordedEvent(payload: {
    schoolId: string;
    classId: string;
    attendanceDate: string;
    records: Array<{
      studentId: string;
      status: AttendanceStatus | string;
    }>;
  }): Promise<void> {
    const studentIds = payload.records.map((record) => record.studentId);
    const [schoolClass, students, parentLinks] = await Promise.all([
      this.classesRepository.findOne({ where: { id: payload.classId, schoolId: payload.schoolId } }),
      this.usersRepository.find({ where: { id: In(studentIds) } }),
      this.parentStudentLinksRepository.find({
        where: studentIds.map((studentId) => ({ schoolId: payload.schoolId, studentId }))
      })
    ]);

    const classLabel = schoolClass?.displayName || schoolClass?.name || 'curso';
    const studentsById = new Map(students.map((student) => [student.id, student]));

    await Promise.all(
      payload.records.flatMap((record) => {
        const student = studentsById.get(record.studentId);
        if (!student) {
          return [];
        }

        const userIds = [record.studentId, ...parentLinks.filter((link) => link.studentId === record.studentId).map((link) => link.parentId)];
        const statusLabel = this.getAttendanceStatusLabel(record.status);

        return userIds.map((userId) =>
          this.createNotification({
            schoolId: payload.schoolId,
            userId,
            title: `Asistencia registrada: ${statusLabel}`,
            message:
              userId === record.studentId
                ? `Se registró ${statusLabel.toLowerCase()} en ${classLabel} el ${payload.attendanceDate}.`
                : `${student.firstName} ${student.lastName} figura con ${statusLabel.toLowerCase()} en ${classLabel} el ${payload.attendanceDate}.`,
            type: 'attendance_alert',
            metadata: {
              classId: payload.classId,
              className: classLabel,
              studentId: student.id,
              studentName: `${student.firstName} ${student.lastName}`,
              attendanceDate: payload.attendanceDate,
              attendanceStatus: record.status
            }
          })
        );
      })
    );
  }
}
