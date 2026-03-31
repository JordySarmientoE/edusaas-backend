import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, ValidateNested } from 'class-validator';
import { TaskGradeEntryDto } from './task-grade-entry.dto';

export class GradeTaskDto {
  @ApiProperty({ type: [TaskGradeEntryDto] })
  @ValidateNested({ each: true })
  @Type(() => TaskGradeEntryDto)
  @ArrayMinSize(1)
  grades!: TaskGradeEntryDto[];
}
