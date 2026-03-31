import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class SetScheduleDto {
  @ApiProperty({ example: 'monday' })
  @IsString()
  @MaxLength(20)
  dayOfWeek!: string;

  @ApiProperty({ example: '08:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  startTime!: string;

  @ApiProperty({ example: '08:45' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  endTime!: string;

  @ApiPropertyOptional({ example: 'Aula 201' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  room?: string;
}
