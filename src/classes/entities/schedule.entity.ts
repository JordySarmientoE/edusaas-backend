import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { SchoolClass } from './class.entity';

@Entity({ name: 'schedules' })
export class Schedule extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  schoolId!: string;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  classId!: string;

  @ManyToOne(() => SchoolClass, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classId' })
  class!: SchoolClass;

  @ApiProperty({ example: 'monday' })
  @Column({ type: 'varchar', length: 20 })
  dayOfWeek!: string;

  @ApiProperty({ example: '08:00' })
  @Column({ type: 'varchar', length: 5 })
  startTime!: string;

  @ApiProperty({ example: '08:45' })
  @Column({ type: 'varchar', length: 5 })
  endTime!: string;

  @ApiPropertyOptional({ example: 'Aula 201', nullable: true })
  @Column({ type: 'varchar', length: 100, nullable: true })
  room!: string | null;
}
