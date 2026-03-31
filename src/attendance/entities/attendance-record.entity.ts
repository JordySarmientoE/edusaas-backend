import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { SchoolClass } from '../../classes/entities/class.entity';
import { User } from '../../users/entities/user.entity';

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late'
}

@Entity({ name: 'attendance_records' })
@Unique(['classId', 'studentId', 'attendanceDate'])
export class AttendanceRecord extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  schoolId!: string;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  classId!: string;

  @ManyToOne(() => SchoolClass, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classId' })
  class!: SchoolClass;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  studentId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student!: User;

  @ApiProperty({ example: '2026-03-28' })
  @Column({ type: 'date' })
  attendanceDate!: string;

  @ApiProperty({ enum: AttendanceStatus, enumName: 'AttendanceStatus' })
  @Column({ type: 'enum', enum: AttendanceStatus })
  status!: AttendanceStatus;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'text', nullable: true })
  remarks!: string | null;
}
