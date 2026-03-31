import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { EnrollmentStatus } from '../entities/enrollment.entity';

export class EnrollmentFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: EnrollmentStatus, enumName: 'EnrollmentStatus' })
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  cycleId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @ApiPropertyOptional({ example: 'lucia' })
  @IsOptional()
  @IsString()
  search?: string;
}
