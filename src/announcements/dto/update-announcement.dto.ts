import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { CreateAnnouncementDto } from './create-announcement.dto';

export class UpdateAnnouncementDto extends PartialType(CreateAnnouncementDto) {
  @ApiPropertyOptional({ type: [String], example: ['announcements/file-a', 'announcements/file-b'] })
  @IsOptional()
  @Transform(({ value }: TransformFnParams): string[] | undefined => {
    if (value === undefined) {
      return undefined;
    }

    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
    }

    return typeof value === 'string' && value.length > 0 ? [value] : [];
  })
  @IsArray()
  @IsString({ each: true })
  keepAttachmentKeys?: string[];
}
