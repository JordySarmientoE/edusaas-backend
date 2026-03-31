import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateClassDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  cycleId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  gradeId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sectionId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  courseId!: string;

  @ApiPropertyOptional({ example: 'Primaria 1 A - Matemática' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ example: 'Matemática' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  subject?: string;

  @ApiPropertyOptional({ example: 'Curso principal' })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  displayName?: string;
}
