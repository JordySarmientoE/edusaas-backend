import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested
} from 'class-validator';
import { AttendanceStatus } from '../entities/attendance-record.entity';

export class AttendanceEntryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId!: string;

  @ApiProperty({ enum: AttendanceStatus, enumName: 'AttendanceStatus' })
  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  @ApiPropertyOptional({ example: 'Llego 10 minutos tarde' })
  @IsOptional()
  @IsString()
  remarks?: string;
}

export class TakeAttendanceDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  classId!: string;

  @ApiProperty({ example: '2026-03-28' })
  @IsDateString()
  attendanceDate!: string;

  @ApiProperty({ type: () => AttendanceEntryDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  records!: AttendanceEntryDto[];
}
