import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUrl, IsUUID, MaxLength, ValidateIf } from 'class-validator';
import { AnnouncementType } from '../entities/announcement.entity';

export class CreateAnnouncementDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  classId!: string;

  @ApiProperty({ example: 'Traer papelotes para la exposición' })
  @IsString()
  @MaxLength(180)
  title!: string;

  @ApiProperty({ example: 'No olviden traer sus papelotes y plumones para la clase del viernes.' })
  @IsString()
  message!: string;

  @ApiProperty({ enum: AnnouncementType, enumName: 'AnnouncementType', example: AnnouncementType.REMINDER })
  @IsEnum(AnnouncementType)
  type!: AnnouncementType;

  @ApiPropertyOptional({ example: 'https://example.com/material.pdf', nullable: true })
  @IsOptional()
  @Transform(({ value }: TransformFnParams): string | null => (value === '' ? null : typeof value === 'string' ? value : null))
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUrl()
  @MaxLength(500)
  linkUrl?: string | null;
}
