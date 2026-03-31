import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Course } from './course.entity';
import { Grade } from './grade.entity';

@Entity({ name: 'grade_course_configs' })
export class GradeCourseConfig extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  schoolId!: string;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  gradeId!: string;

  @ManyToOne(() => Grade, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gradeId' })
  grade!: Grade;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  courseId!: string;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course!: Course;

  @ApiProperty({ example: true })
  @Column({ type: 'boolean', default: true })
  isRequired!: boolean;

  @ApiPropertyOptional({ example: 4, nullable: true })
  @Column({ type: 'int', nullable: true })
  weeklyHours!: number | null;

  @ApiProperty({ example: 1 })
  @Column({ type: 'int', default: 1 })
  order!: number;

  @ApiProperty()
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;
}
