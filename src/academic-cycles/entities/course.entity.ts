import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { School } from '../../schools/entities/school.entity';

@Entity({ name: 'courses' })
export class Course extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  schoolId!: string;

  @ManyToOne(() => School, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schoolId' })
  school!: School;

  @ApiProperty({ example: 'Matemática' })
  @Column({ type: 'varchar', length: 140 })
  name!: string;

  @ApiPropertyOptional({ example: 'MAT', nullable: true })
  @Column({ type: 'varchar', length: 40, nullable: true })
  code!: string | null;

  @ApiPropertyOptional({ example: 'Ciencias', nullable: true })
  @Column({ type: 'varchar', length: 120, nullable: true })
  area!: string | null;

  @ApiProperty()
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;
}
