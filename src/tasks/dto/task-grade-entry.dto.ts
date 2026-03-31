import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class TaskGradeEntryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId!: string;

  @ApiProperty({ example: 18 })
  @IsNumber()
  @Min(0)
  rawScore!: number;

  @ApiPropertyOptional({ example: 'Buen trabajo', nullable: true })
  @IsOptional()
  @IsString()
  feedback?: string;
}
