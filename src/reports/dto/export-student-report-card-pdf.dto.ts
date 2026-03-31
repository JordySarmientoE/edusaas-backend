import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ExportStudentReportCardPdfDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  cycleId!: string;
}
