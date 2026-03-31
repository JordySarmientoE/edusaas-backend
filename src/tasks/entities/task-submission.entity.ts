import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Task } from './task.entity';

export enum TaskSubmissionStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  LATE = 'late'
}

@Entity({ name: 'task_submissions' })
@Unique(['taskId', 'studentId'])
export class TaskSubmission extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  schoolId!: string;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  taskId!: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task!: Task;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  studentId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student!: User;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'text', nullable: true })
  content!: string | null;

  @ApiProperty({ enum: TaskSubmissionStatus, enumName: 'TaskSubmissionStatus' })
  @Column({ type: 'enum', enum: TaskSubmissionStatus, default: TaskSubmissionStatus.PENDING })
  status!: TaskSubmissionStatus;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  submittedAt!: Date | null;
}
