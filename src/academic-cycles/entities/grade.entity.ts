import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum GradeLevel {
  INITIAL = 'initial',
  PRIMARY = 'primary',
  SECONDARY = 'secondary'
}

@Entity({ name: 'grades' })
export class Grade extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  schoolId!: string;

  @ApiProperty({ example: 'Primaria 1' })
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @ApiProperty({ enum: GradeLevel, enumName: 'GradeLevel', example: GradeLevel.PRIMARY })
  @Column({ type: 'varchar', length: 30, default: GradeLevel.PRIMARY })
  level!: GradeLevel;

  @ApiProperty({ example: 5 })
  @Column({ type: 'int' })
  order!: number;

  @ApiPropertyOptional({ example: 'Primer grado del nivel primario', nullable: true })
  @Column({ type: 'varchar', length: 180, nullable: true })
  description!: string | null;

  @ApiProperty()
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;
}
