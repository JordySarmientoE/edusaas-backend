import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { AcademicCycle } from './academic-cycle.entity';
import { Grade } from './grade.entity';

@Entity({ name: 'sections' })
export class Section extends BaseEntity {
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

  @ApiProperty({ example: 'A' })
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @ApiPropertyOptional({ example: 30, nullable: true })
  @Column({ type: 'int', nullable: true })
  capacity!: number | null;

  @ApiProperty()
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;
}
