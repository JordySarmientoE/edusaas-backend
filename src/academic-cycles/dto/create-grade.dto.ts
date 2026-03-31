import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { GradeLevel } from '../entities/grade.entity';

export class CreateGradeDto {
  @ApiProperty({ example: 'Primaria 1' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: GradeLevel, enumName: 'GradeLevel', example: GradeLevel.PRIMARY })
  @IsEnum(GradeLevel)
  level!: GradeLevel;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  order!: number;

  @ApiProperty({ example: 'Primer grado de primaria', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  description?: string;
}
