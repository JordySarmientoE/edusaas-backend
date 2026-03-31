import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { AcademicCycle } from '../../academic-cycles/entities/academic-cycle.entity';
import { Section } from '../../academic-cycles/entities/section.entity';
import { User } from '../../users/entities/user.entity';

export enum EnrollmentStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected'
}

@Entity({ name: 'enrollments' })
export class Enrollment extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  schoolId!: string;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  cycleId!: string;

  @ManyToOne(() => AcademicCycle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cycleId' })
  cycle!: AcademicCycle;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  sectionId!: string | null;

  @ManyToOne(() => Section, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sectionId' })
  section!: Section | null;

  @ApiProperty({ example: 'Lucia' })
  @Column({ type: 'varchar', length: 100 })
  firstName!: string;

  @ApiProperty({ example: 'Gomez' })
  @Column({ type: 'varchar', length: 100 })
  lastName!: string;

  @ApiProperty({ example: 'lucia.gomez@familia.pe' })
  @Column({ type: 'varchar', length: 180 })
  email!: string;

  @ApiPropertyOptional({ example: '+51987654321', nullable: true })
  @Column({ type: 'varchar', length: 30, nullable: true })
  phoneNumber!: string | null;

  @ApiPropertyOptional({ example: '2014-05-10', nullable: true })
  @Column({ type: 'date', nullable: true })
  birthDate!: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @ApiProperty({ enum: EnrollmentStatus, enumName: 'EnrollmentStatus' })
  @Column({ type: 'enum', enum: EnrollmentStatus, default: EnrollmentStatus.PENDING })
  status!: EnrollmentStatus;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  studentUserId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'studentUserId' })
  studentUser!: User | null;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  expedient!: Record<string, unknown>;
}
