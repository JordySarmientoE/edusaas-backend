import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type, type TransformFnParams } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { TaskSubmissionMode, TaskType } from '../entities/task.entity';

export class CreateTaskDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  classId!: string;

  @ApiProperty({ example: 'Resolver practica 3' })
  @IsString()
  @MaxLength(180)
  title!: string;

  @ApiProperty({ example: 'Completar ejercicios 1 al 10 del cuaderno.' })
  @IsString()
  description!: string;

  @ApiProperty({ enum: TaskType, enumName: 'TaskType', example: TaskType.HOMEWORK })
  @IsEnum(TaskType)
  taskType!: TaskType;

  @ApiProperty({ enum: TaskSubmissionMode, enumName: 'TaskSubmissionMode', example: TaskSubmissionMode.STUDENT_SUBMISSION })
  @IsEnum(TaskSubmissionMode)
  submissionMode!: TaskSubmissionMode;

  @ApiProperty({ example: true })
  @Transform(({ value }: TransformFnParams): boolean => value === true || value === 'true')
  @IsBoolean()
  affectsGrade!: boolean;

  @ApiPropertyOptional({ example: 20, nullable: true })
  @IsOptional()
  @Transform(({ value }: TransformFnParams): number | null | undefined =>
    value === '' || value === null || value === undefined ? null : Number(value)
  )
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxScore?: number | null;

  @ApiProperty({ example: '2026-04-02' })
  @IsDateString()
  dueDate!: string;
}
