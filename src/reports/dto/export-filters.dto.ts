import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ExportableEntity } from '../enums/exportable-entity.enum';

export class ExportFiltersDto {
  @ApiProperty({ enum: ExportableEntity, enumName: 'ExportableEntity' })
  @IsEnum(ExportableEntity)
  entity!: ExportableEntity;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  cycleId?: string;

  @ApiPropertyOptional({ example: '2026-03-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-03-31' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
