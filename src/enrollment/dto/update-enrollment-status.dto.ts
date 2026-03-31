import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { EnrollmentStatus } from '../entities/enrollment.entity';

export class UpdateEnrollmentStatusDto {
  @ApiProperty({ enum: EnrollmentStatus, enumName: 'EnrollmentStatus' })
  @IsEnum(EnrollmentStatus)
  status!: EnrollmentStatus;
}
