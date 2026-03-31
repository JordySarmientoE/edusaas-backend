import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ExportChildReportCardPdfDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  cycleId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId!: string;
}
