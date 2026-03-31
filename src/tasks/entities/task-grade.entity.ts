import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Task } from './task.entity';

@Entity({ name: 'task_grades' })
@Unique(['taskId', 'studentId'])
export class TaskGrade extends BaseEntity {
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

  @ApiProperty({ example: 18 })
  @Column({ type: 'float' })
  rawScore!: number;

  @ApiProperty({ example: '18' })
  @Column({ type: 'varchar', length: 20 })
  scaledScore!: string;

  @ApiPropertyOptional({ example: 'Buen desarrollo, mejora la redacción.', nullable: true })
  @Column({ type: 'text', nullable: true })
  feedback!: string | null;

  @ApiPropertyOptional({ example: '2026-03-30T18:20:00.000Z', nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  gradedAt!: Date | null;
}
