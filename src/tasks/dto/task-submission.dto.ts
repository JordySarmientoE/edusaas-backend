import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskSubmissionStatus } from '../entities/task-submission.entity';

export class TaskSubmissionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  taskId!: string;

  @ApiProperty({ format: 'uuid' })
  studentId!: string;

  @ApiPropertyOptional({ nullable: true })
  content!: string | null;

  @ApiProperty({ enum: TaskSubmissionStatus, enumName: 'TaskSubmissionStatus' })
  status!: TaskSubmissionStatus;

  @ApiPropertyOptional({ nullable: true })
  submittedAt!: Date | null;
}
