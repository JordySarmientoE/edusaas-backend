import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { DocumentType } from '../entities/document-template.entity';

export class CreateTemplateDto {
  @ApiProperty({ example: 'Constancia de estudios' })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ enum: DocumentType, enumName: 'DocumentType' })
  @IsEnum(DocumentType)
  type!: DocumentType;

  @ApiProperty()
  @IsString()
  htmlContent!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
