import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum DocumentType {
  CERTIFICATE = 'certificate',
  CONSTANCY = 'constancy',
  REPORT_CARD = 'report_card',
  CUSTOM = 'custom'
}

@Entity({ name: 'document_templates' })
export class DocumentTemplate extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  schoolId!: string;

  @ApiProperty({ example: 'Constancia de estudios' })
  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @ApiProperty({ enum: DocumentType, enumName: 'DocumentType' })
  @Column({ type: 'enum', enum: DocumentType, default: DocumentType.CUSTOM })
  type!: DocumentType;

  @ApiProperty()
  @Column({ type: 'text' })
  htmlContent!: string;

  @ApiProperty()
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;
}
