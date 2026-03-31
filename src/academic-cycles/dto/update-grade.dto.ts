import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { GradeLevel } from '../entities/grade.entity';

export class UpdateGradeDto {
  @ApiPropertyOptional({ example: 'Primaria 1' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: GradeLevel, enumName: 'GradeLevel' })
  @IsOptional()
  @IsEnum(GradeLevel)
  level?: GradeLevel;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;

  @ApiPropertyOptional({ example: 'Primer grado de primaria' })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
