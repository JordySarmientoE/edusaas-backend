import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { SchoolConfig } from '../../school-config/entities/school-config.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'schools' })
export class School extends BaseEntity {
  @ApiProperty({ example: 'Colegio San Martin' })
  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @ApiProperty({ example: 'colegio-san-martin' })
  @Column({ type: 'varchar', length: 150, unique: true })
  slug!: string;

  @ApiPropertyOptional({ example: 'direccion@colegio.edu.pe', nullable: true })
  @Column({ type: 'varchar', length: 150, nullable: true })
  contactEmail!: string | null;

  @ApiProperty()
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @OneToOne(() => SchoolConfig, (config) => config.school)
  config?: SchoolConfig;

  @OneToMany(() => User, (user) => user.school)
  users?: User[];
}
