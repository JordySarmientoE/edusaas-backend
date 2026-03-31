import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity({ name: 'audit_logs' })
@Index(['schoolId', 'createdAt'])
export class AuditLog extends BaseEntity {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  @ApiProperty({ example: 'user.updated' })
  @Column({ type: 'varchar', length: 100 })
  action!: string;

  @ApiProperty({ example: 'User' })
  @Column({ type: 'varchar', length: 100 })
  entityType!: string;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'varchar', length: 100, nullable: true })
  entityId!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  schoolId!: string | null;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: Record<string, unknown>;
}
