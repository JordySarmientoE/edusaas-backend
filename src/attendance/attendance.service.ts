import { ConflictException, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Between } from 'typeorm';
import { ClassesService } from '../classes/classes.service';
import { Role } from '../common/enums/role.enum';
import { UsersService } from '../users/users.service';
import { DateRangeDto } from './dto/date-range.dto';
import { TakeAttendanceDto } from './dto/take-attendance.dto';
import { AttendanceRecord, AttendanceStatus } from './entities/attendance-record.entity';
import {
  AttendanceParentLinksRepository,
  AttendanceRecordsRepository,
  AttendanceStudentAssignmentsRepository
} from './repositories';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly attendanceRepository: AttendanceRecordsRepository,
    private readonly studentClassAssignmentsRepository: AttendanceStudentAssignmentsRepository,
    private readonly parentStudentLinksRepository: AttendanceParentLinksRepository,
    private readonly classesService: ClassesService,
    private readonly usersService: UsersService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async takeAttendance(dto: TakeAttendanceDto, schoolId: string): Promise<AttendanceRecord[]> {
    await this.classesService.findById(dto.classId, schoolId);

    const records: AttendanceRecord[] = [];

    for (const entry of dto.records) {
      await this.usersService.findById(entry.studentId, schoolId);
      await this.usersService.ensureUserHasRoleInSchool(entry.studentId, schoolId, [Role.STUDENT]);

      const assignment = await this.studentClassAssignmentsRepository.findOne({
        where: {
          schoolId,
          classId: dto.classId,
          studentId: entry.studentId
        }
      });

      if (!assignment) {
        throw new ConflictException('El alumno no está asignado a la clase');
      }

      let record = await this.attendanceRepository.findOne({
        where: {
          schoolId,
          classId: dto.classId,
          studentId: entry.studentId,
          attendanceDate: dto.attendanceDate
        }
      });

      if (!record) {
        record = this.attendanceRepository.create({
          schoolId,
          classId: dto.classId,
          studentId: entry.studentId,
          attendanceDate: dto.attendanceDate,
          status: entry.status,
          remarks: entry.remarks ?? null
        });
      } else {
        record.status = entry.status;
        record.remarks = entry.remarks ?? null;
      }

      records.push(await this.attendanceRepository.save(record));
    }

    const notifyRecords = records.filter((record) => record.status !== AttendanceStatus.PRESENT);

    if (notifyRecords.length > 0) {
      this.eventEmitter.emit('attendance.recorded', {
        schoolId,
        classId: dto.classId,
        attendanceDate: dto.attendanceDate,
        records: notifyRecords.map((record) => ({
          studentId: record.studentId,
          status: record.status
        }))
      });
    }

    return records;
  }

  async getByClass(classId: string, filters: DateRangeDto, schoolId: string): Promise<AttendanceRecord[]> {
    await this.classesService.findById(classId, schoolId);

    if (filters.from && filters.to) {
      return this.attendanceRepository.find({
        where: {
          schoolId,
          classId,
          attendanceDate: Between(filters.from, filters.to)
        },
        relations: { student: true },
        order: { attendanceDate: 'DESC' }
      });
    }

    return this.attendanceRepository.find({
      where: { schoolId, classId },
      relations: { student: true },
      order: { attendanceDate: 'DESC' }
    });
  }

  async getByStudent(studentId: string, schoolId: string): Promise<AttendanceRecord[]> {
    await this.usersService.findById(studentId, schoolId);
    return this.attendanceRepository.find({
      where: { schoolId, studentId },
      relations: { student: true },
      order: { attendanceDate: 'DESC' }
    });
  }

  async getByParent(parentId: string, schoolId: string): Promise<AttendanceRecord[]> {
    await this.usersService.findById(parentId, schoolId);
    await this.usersService.ensureUserCanAccessLinkedStudentsInSchool(parentId, schoolId);

    const links = await this.parentStudentLinksRepository.find({
      where: { schoolId, parentId }
    });

    if (links.length === 0) {
      return [];
    }

    const studentIds = links.map((link) => link.studentId);
    return this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.student', 'student')
      .where('attendance.schoolId = :schoolId', { schoolId })
      .andWhere('attendance.studentId IN (:...studentIds)', { studentIds })
      .orderBy('attendance.attendanceDate', 'DESC')
      .getMany();
  }
}
