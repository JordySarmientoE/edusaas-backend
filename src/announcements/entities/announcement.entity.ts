import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { SchoolClass } from '../../classes/entities/class.entity';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

class AnnouncementAttachmentMetadata {
  @ApiProperty()
  url!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  mimeType!: string | null;

  @ApiProperty({ enum: ['local', 'cloudinary'] })
  provider!: 'local' | 'cloudinary';
}

export enum AnnouncementType {
  ANNOUNCEMENT = 'announcement',
  REMINDER = 'reminder',
  MATERIAL = 'material',
  LINK = 'link'
}

@Entity({ name: 'announcements' })
export class Announcement extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  schoolId!: string;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  classId!: string;

  @ManyToOne(() => SchoolClass, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classId' })
  class!: SchoolClass;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  teacherId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'teacherId' })
  teacher!: User | null;

  @ApiProperty({ example: 'Traer papelotes para la exposición' })
  @Column({ type: 'varchar', length: 180 })
  title!: string;

  @ApiProperty({ example: 'No olviden traer sus papelotes y plumones para la clase del viernes.' })
  @Column({ type: 'text' })
  message!: string;

  @ApiProperty({ enum: AnnouncementType, enumName: 'AnnouncementType' })
  @Column({ type: 'enum', enum: AnnouncementType, default: AnnouncementType.ANNOUNCEMENT })
  type!: AnnouncementType;

  @ApiPropertyOptional({ example: 'https://example.com/material.pdf', nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  linkUrl!: string | null;

  @ApiPropertyOptional({ example: '/uploads/announcements/presentacion.pdf', nullable: true })
  @Column({ type: 'varchar', length: 1000, nullable: true })
  attachmentUrl!: string | null;

  @ApiPropertyOptional({ example: 'presentacion.pdf', nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  attachmentName!: string | null;

  @ApiPropertyOptional({ example: 'application/pdf', nullable: true })
  @Column({ type: 'varchar', length: 160, nullable: true })
  attachmentMimeType!: string | null;

  @ApiPropertyOptional({ example: 'EduSaaS/announcements/presentacion-uuid', nullable: true })
  @Column({ type: 'varchar', length: 1000, nullable: true })
  attachmentStorageKey!: string | null;

  @ApiPropertyOptional({ type: () => [AnnouncementAttachmentMetadata] })
  @Column({ type: 'jsonb', default: () => "'[]'" })
  attachments!: Array<{
    url: string;
    key: string;
    name: string;
    mimeType: string | null;
    provider: 'local' | 'cloudinary';
  }>;
}
