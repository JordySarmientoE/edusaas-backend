import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskSubmissionStatus } from '../entities/task-submission.entity';

export class TaskGradebookStudentDto {
  @ApiProperty({ format: 'uuid' })
  studentId!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional({ example: 18, nullable: true })
  rawScore!: number | null;

  @ApiPropertyOptional({ example: '18', nullable: true })
  scaledScore!: string | null;

  @ApiPropertyOptional({ nullable: true })
  feedback!: string | null;

  @ApiPropertyOptional({ nullable: true })
  gradedAt!: Date | null;

  @ApiProperty({ enum: TaskSubmissionStatus, enumName: 'TaskSubmissionStatus' })
  submissionStatus!: TaskSubmissionStatus;

  @ApiPropertyOptional({ nullable: true })
  submissionContent!: string | null;

  @ApiPropertyOptional({ nullable: true })
  submittedAt!: Date | null;
}
