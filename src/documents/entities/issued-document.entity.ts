import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { DocumentTemplate, DocumentType } from './document-template.entity';

@Entity({ name: 'issued_documents' })
export class IssuedDocument extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  schoolId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  templateId!: string | null;

  @ManyToOne(() => DocumentTemplate, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'templateId' })
  template!: DocumentTemplate | null;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  studentId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student!: User;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  issuedById!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'issuedById' })
  issuedBy!: User | null;

  @ApiProperty({ enum: DocumentType, enumName: 'DocumentType' })
  @Column({ type: 'enum', enum: DocumentType, default: DocumentType.CUSTOM })
  documentType!: DocumentType;

  @ApiProperty({ example: 'Constancia de estudios 2026' })
  @Column({ type: 'varchar', length: 180 })
  title!: string;

  @ApiProperty({ example: '/uploads/documents/constancia-2026.pdf' })
  @Column({ type: 'varchar', length: 255 })
  fileUrl!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, unknown>;
}
