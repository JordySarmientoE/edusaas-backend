import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { School } from '../../schools/entities/school.entity';

@Entity({ name: 'academic_cycles' })
export class AcademicCycle extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  schoolId!: string;

  @ManyToOne(() => School, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schoolId' })
  school!: School;

  @ApiProperty({ example: '2026' })
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @ApiProperty({ example: 2026 })
  @Column({ type: 'int', default: 2026 })
  year!: number;

  @ApiPropertyOptional({ example: '1', nullable: true })
  @Column({ type: 'varchar', length: 40, nullable: true })
  term!: string | null;

  @ApiPropertyOptional({ example: '2026-03-01', nullable: true })
  @Column({ type: 'date', nullable: true })
  startDate!: string | null;

  @ApiPropertyOptional({ example: '2026-12-20', nullable: true })
  @Column({ type: 'date', nullable: true })
  endDate!: string | null;

  @ApiProperty()
  @Column({ type: 'boolean', default: false })
  isClosed!: boolean;
}
