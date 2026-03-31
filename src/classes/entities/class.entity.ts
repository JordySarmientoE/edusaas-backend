import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { AcademicCycle } from '../../academic-cycles/entities/academic-cycle.entity';
import { Course } from '../../academic-cycles/entities/course.entity';
import { Grade } from '../../academic-cycles/entities/grade.entity';
import { Section } from '../../academic-cycles/entities/section.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'classes' })
export class SchoolClass extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  schoolId!: string;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  cycleId!: string;

  @ManyToOne(() => AcademicCycle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cycleId' })
  cycle!: AcademicCycle;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  gradeId!: string;

  @ManyToOne(() => Grade, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gradeId' })
  grade!: Grade;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  sectionId!: string;

  @ManyToOne(() => Section, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sectionId' })
  section!: Section;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  courseId!: string | null;

  @ManyToOne(() => Course, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'courseId' })
  course!: Course | null;

  @ApiProperty({ example: 'Primaria 1 A - Matemática' })
  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @ApiPropertyOptional({ example: 'Matemática', nullable: true })
  @Column({ type: 'varchar', length: 150, nullable: true })
  subject!: string | null;

  @ApiPropertyOptional({ example: 'Curso principal del lunes y miércoles', nullable: true })
  @Column({ type: 'varchar', length: 180, nullable: true })
  displayName!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  teacherId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'teacherId' })
  teacher!: User | null;

  @ApiProperty()
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;
}
