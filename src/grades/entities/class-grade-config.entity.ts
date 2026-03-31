import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { SchoolClass } from '../../classes/entities/class.entity';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity({ name: 'class_grade_configs' })
@Unique(['schoolId', 'classId'])
export class ClassGradeConfig extends BaseEntity {
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
  cycleId!: string;

  @ApiProperty({ example: 20 })
  @Column({ type: 'float', default: 20 })
  examsWeight!: number;

  @ApiProperty({ example: 30 })
  @Column({ type: 'float', default: 30 })
  participationsWeight!: number;

  @ApiProperty({ example: 50 })
  @Column({ type: 'float', default: 50 })
  tasksWeight!: number;

  @ApiProperty({ example: 11 })
  @Column({ type: 'float', default: 11 })
  passingScore!: number;

  @ApiProperty({ example: 70 })
  @Column({ type: 'float', default: 70 })
  minimumAttendancePercentage!: number;

  @ApiProperty()
  @Column({ type: 'boolean', default: false })
  isClosed!: boolean;
}
