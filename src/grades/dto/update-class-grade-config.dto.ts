import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';

export class UpdateClassGradeConfigDto {
  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(0)
  @Max(100)
  examsWeight!: number;

  @ApiProperty({ example: 30 })
  @IsNumber()
  @Min(0)
  @Max(100)
  participationsWeight!: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  @Max(100)
  tasksWeight!: number;

  @ApiProperty({ example: 11 })
  @IsNumber()
  @Min(0)
  passingScore!: number;

  @ApiProperty({ example: 70 })
  @IsNumber()
  @Min(0)
  @Max(100)
  minimumAttendancePercentage!: number;
}
