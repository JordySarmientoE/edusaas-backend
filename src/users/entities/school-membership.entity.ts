import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { BaseEntity } from '../../common/entities/base.entity';
import { School } from '../../schools/entities/school.entity';
import { User } from './user.entity';

export enum SchoolMembershipStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}

@Entity({ name: 'school_memberships' })
@Unique(['schoolId', 'userId', 'role'])
@Index(['userId', 'status'])
export class SchoolMembership extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  schoolId!: string;

  @ManyToOne(() => School, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schoolId' })
  school!: School;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ApiProperty({ enum: Role, enumName: 'Role' })
  @Column({ type: 'enum', enum: Role })
  role!: Role;

  @ApiProperty({ enum: SchoolMembershipStatus, enumName: 'SchoolMembershipStatus' })
  @Column({ type: 'enum', enum: SchoolMembershipStatus, default: SchoolMembershipStatus.ACTIVE })
  status!: SchoolMembershipStatus;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  invitedByUserId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  joinedAt!: Date | null;
}
