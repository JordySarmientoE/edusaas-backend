import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, Unique } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { BaseEntity } from '../../common/entities/base.entity';

export enum SchoolInvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  CANCELLED = 'cancelled'
}

@Entity({ name: 'school_invitations' })
@Unique(['schoolId', 'email', 'role'])
@Index(['email', 'status'])
export class SchoolInvitation extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  schoolId!: string;

  @ApiProperty({ example: 'parent@example.com' })
  @Column({ type: 'varchar', length: 180 })
  email!: string;

  @ApiProperty({ enum: Role, enumName: 'Role' })
  @Column({ type: 'enum', enum: Role })
  role!: Role;

  @ApiProperty({ enum: SchoolInvitationStatus, enumName: 'SchoolInvitationStatus' })
  @Column({ type: 'enum', enum: SchoolInvitationStatus, default: SchoolInvitationStatus.PENDING })
  status!: SchoolInvitationStatus;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  invitedByUserId!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  acceptedByUserId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  acceptedAt!: Date | null;
}
