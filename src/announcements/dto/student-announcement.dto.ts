import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnnouncementType } from '../entities/announcement.entity';

export class StudentAnnouncementDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  classId!: string;

  @ApiProperty({ example: 'Traer papelotes para la exposición' })
  title!: string;

  @ApiProperty({ example: 'No olviden traer sus papelotes y plumones para la clase del viernes.' })
  message!: string;

  @ApiProperty({ enum: AnnouncementType, enumName: 'AnnouncementType' })
  type!: AnnouncementType;

  @ApiPropertyOptional({ nullable: true })
  linkUrl!: string | null;

  @ApiPropertyOptional({ nullable: true })
  attachmentUrl!: string | null;

  @ApiPropertyOptional({ nullable: true })
  attachmentName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  attachmentMimeType!: string | null;

  @ApiPropertyOptional({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        key: { type: 'string' },
        name: { type: 'string' },
        mimeType: { type: 'string', nullable: true },
        provider: { type: 'string', enum: ['local', 'cloudinary'] }
      }
    }
  })
  attachments!: Array<{
    url: string;
    key: string;
    name: string;
    mimeType: string | null;
    provider: 'local' | 'cloudinary';
  }>;

  @ApiProperty()
  createdAt!: Date;
}
