import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class RegisterGradeDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  classId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  cycleId!: string;

  @ApiProperty({ example: 'Parcial 1' })
  @IsString()
  @MaxLength(150)
  evaluationName!: string;

  @ApiProperty({ example: 18.5 })
  @IsNumber()
  @Min(0)
  rawScore!: number;
}
