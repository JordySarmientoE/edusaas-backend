import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { SchoolClass } from '../../classes/entities/class.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'grade_records' })
export class GradeRecord extends BaseEntity {
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

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  cycleId!: string;

  @ApiProperty({ example: 'Parcial 1' })
  @Column({ type: 'varchar', length: 150 })
  evaluationName!: string;

  @ApiProperty({ example: 18.5 })
  @Column({ type: 'decimal', precision: 6, scale: 2 })
  rawScore!: number;

  @ApiProperty({ example: '18.50' })
  @Column({ type: 'varchar', length: 50 })
  scaledScore!: string;

  @ApiProperty()
  @Column({ type: 'boolean', default: false })
  isClosed!: boolean;
}
