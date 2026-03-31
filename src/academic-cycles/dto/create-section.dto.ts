import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateSectionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  gradeId!: string;

  @ApiProperty({ example: 'A' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}
