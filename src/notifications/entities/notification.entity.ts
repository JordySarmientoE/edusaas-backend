import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'notifications' })
export class Notification extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  schoolId!: string;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ApiProperty({ example: 'Nueva tarea asignada' })
  @Column({ type: 'varchar', length: 180 })
  title!: string;

  @ApiProperty({ example: 'Tienes una nueva tarea pendiente en Matematica.' })
  @Column({ type: 'text' })
  message!: string;

  @ApiProperty()
  @Column({ type: 'boolean', default: false })
  isRead!: boolean;

  @ApiPropertyOptional({ nullable: true })
  @Column({ type: 'varchar', length: 60, nullable: true })
  type!: string | null;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: Record<string, unknown>;
}
