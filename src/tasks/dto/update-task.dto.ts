import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type, type TransformFnParams } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { TaskSubmissionMode, TaskType } from '../entities/task.entity';

export class UpdateTaskDto {
  @ApiPropertyOptional({ example: 'Resolver practica 4' })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @ApiPropertyOptional({ example: 'Completar ejercicios 11 al 20.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TaskType, enumName: 'TaskType', example: TaskType.PRACTICE })
  @IsOptional()
  @IsEnum(TaskType)
  taskType?: TaskType;

  @ApiPropertyOptional({ enum: TaskSubmissionMode, enumName: 'TaskSubmissionMode', example: TaskSubmissionMode.TEACHER_ONLY })
  @IsOptional()
  @IsEnum(TaskSubmissionMode)
  submissionMode?: TaskSubmissionMode;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }: TransformFnParams): boolean | undefined =>
    value === undefined ? undefined : value === true || value === 'true'
  )
  @IsBoolean()
  affectsGrade?: boolean;

  @ApiPropertyOptional({ example: 20, nullable: true })
  @IsOptional()
  @Transform(({ value }: TransformFnParams): number | null | undefined =>
    value === '' || value === null || value === undefined ? null : Number(value)
  )
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxScore?: number | null;

  @ApiPropertyOptional({ example: '2026-04-05' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ type: [String], example: ['tasks/file-a', 'tasks/file-b'] })
  @IsOptional()
  @Transform(({ value }: TransformFnParams): string[] | undefined => {
    if (value === undefined) {
      return undefined;
    }

    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
    }

    return typeof value === 'string' && value.length > 0 ? [value] : [];
  })
  @IsArray()
  @IsString({ each: true })
  keepAttachmentKeys?: string[];
}
