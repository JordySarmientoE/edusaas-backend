import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { GradeScale } from '../entities/school-config.entity';

export class UpdateSchoolConfigDto {
  @ApiPropertyOptional({ example: '28 126 214' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{1,3}\s\d{1,3}\s\d{1,3}$/)
  primaryColor?: string;

  @ApiPropertyOptional({ example: '14 165 233' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{1,3}\s\d{1,3}\s\d{1,3}$/)
  secondaryColor?: string;

  @ApiPropertyOptional({ example: 'Maria Torres' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  principalName?: string;

  @ApiPropertyOptional({ enum: GradeScale, enumName: 'GradeScale' })
  @IsOptional()
  @IsEnum(GradeScale)
  gradingScale?: GradeScale;

  @ApiPropertyOptional({ example: 'Uso obligatorio del uniforme.' })
  @IsOptional()
  @IsString()
  schoolRules?: string;
}
