import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Role } from '../../common/enums/role.enum';
import { School } from '../../schools/entities/school.entity';

@Entity({ name: 'users' })
export class User extends BaseEntity {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  schoolId!: string | null;

  @ManyToOne(() => School, (school) => school.users, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'schoolId' })
  school!: School | null;

  @ApiProperty({ example: 'Juan' })
  @Column({ type: 'varchar', length: 100 })
  firstName!: string;

  @ApiProperty({ example: 'Perez' })
  @Column({ type: 'varchar', length: 100 })
  lastName!: string;

  @ApiPropertyOptional({ example: '+51987654321', nullable: true })
  @Column({ type: 'varchar', length: 30, nullable: true })
  phoneNumber!: string | null;

  @ApiProperty({ example: 'juan.perez@colegio.edu.pe' })
  @Column({ type: 'varchar', length: 180, unique: true })
  email!: string;

  @ApiPropertyOptional({ example: '/uploads/avatars/juan-perez.png', nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  @ApiProperty({ enum: Role, enumName: 'Role' })
  @Column({ type: 'enum', enum: Role })
  role!: Role;

  @ApiProperty()
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  refreshTokenHash!: string | null;
}
