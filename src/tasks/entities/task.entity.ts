import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { SchoolClass } from '../../classes/entities/class.entity';
import { User } from '../../users/entities/user.entity';

class TaskAttachmentMetadata {
  @ApiProperty()
  url!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  mimeType!: string | null;

  @ApiProperty({ enum: ['local', 'cloudinary'] })
  provider!: 'local' | 'cloudinary';
}

export enum TaskType {
  HOMEWORK = 'homework',
  PRACTICE = 'practice',
  EXAM = 'exam',
  PROJECT = 'project',
  PARTICIPATION = 'participation',
  OTHER = 'other'
}

export enum TaskSubmissionMode {
  STUDENT_SUBMISSION = 'student_submission',
  TEACHER_ONLY = 'teacher_only'
}

@Entity({ name: 'tasks' })
export class Task extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  schoolId!: string;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  classId!: string;

  @ManyToOne(() => SchoolClass, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classId' })
  class!: SchoolClass;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  teacherId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'teacherId' })
  teacher!: User | null;

  @ApiProperty({ example: 'Resolver practica 3' })
  @Column({ type: 'varchar', length: 180 })
  title!: string;

  @ApiProperty({ example: 'Completar ejercicios 1 al 10 del cuaderno.' })
  @Column({ type: 'text' })
  description!: string;

  @ApiProperty({ enum: TaskType, enumName: 'TaskType' })
  @Column({ type: 'enum', enum: TaskType, default: TaskType.HOMEWORK })
  taskType!: TaskType;

  @ApiProperty({ enum: TaskSubmissionMode, enumName: 'TaskSubmissionMode' })
  @Column({ type: 'enum', enum: TaskSubmissionMode, default: TaskSubmissionMode.STUDENT_SUBMISSION })
  submissionMode!: TaskSubmissionMode;

  @ApiProperty({ example: true })
  @Column({ type: 'boolean', default: true })
  affectsGrade!: boolean;

  @ApiPropertyOptional({ example: 20, nullable: true })
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  maxScore!: number | null;

  @ApiPropertyOptional({ example: '/uploads/tasks/guia-matematica.pdf', nullable: true })
  @Column({ type: 'varchar', length: 1000, nullable: true })
  attachmentUrl!: string | null;

  @ApiPropertyOptional({ example: 'guia-matematica.pdf', nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  attachmentName!: string | null;

  @ApiPropertyOptional({ example: 'application/pdf', nullable: true })
  @Column({ type: 'varchar', length: 160, nullable: true })
  attachmentMimeType!: string | null;

  @ApiPropertyOptional({ example: 'EduSaaS/tasks/guia-matematica-uuid', nullable: true })
  @Column({ type: 'varchar', length: 1000, nullable: true })
  attachmentStorageKey!: string | null;

  @ApiPropertyOptional({ type: () => [TaskAttachmentMetadata] })
  @Column({ type: 'jsonb', default: () => "'[]'" })
  attachments!: Array<{
    url: string;
    key: string;
    name: string;
    mimeType: string | null;
    provider: 'local' | 'cloudinary';
  }>;

  @ApiProperty({ example: '2026-04-02' })
  @Column({ type: 'date' })
  dueDate!: string;
}
