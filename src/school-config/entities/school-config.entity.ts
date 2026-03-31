import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { School } from '../../schools/entities/school.entity';

export enum GradeScale {
  NUMERIC_20 = 'numeric_20',
  NUMERIC_10 = 'numeric_10',
  LITERAL = 'literal'
}

@Entity({ name: 'school_configs' })
export class SchoolConfig extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid', unique: true })
  schoolId!: string;

  @OneToOne(() => School, (school) => school.config, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schoolId' })
  school!: School;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  logoUrl!: string | null;

  @ApiProperty({ example: '28 126 214' })
  @Column({ type: 'varchar', length: 30, default: '28 126 214' })
  primaryColor!: string;

  @ApiProperty({ example: '14 165 233' })
  @Column({ type: 'varchar', length: 30, default: '14 165 233' })
  secondaryColor!: string;

  @ApiPropertyOptional({ example: 'Maria Torres', nullable: true })
  @Column({ type: 'varchar', length: 150, nullable: true })
  principalName!: string | null;

  @ApiProperty({ enum: GradeScale, enumName: 'GradeScale' })
  @Column({ type: 'enum', enum: GradeScale, default: GradeScale.NUMERIC_20 })
  gradingScale!: GradeScale;

  @ApiProperty({ example: 'Uso obligatorio del uniforme.' })
  @Column({ type: 'text', default: '' })
  schoolRules!: string;
}
