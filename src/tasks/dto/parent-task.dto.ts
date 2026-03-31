import { ApiProperty } from '@nestjs/swagger';
import { Task } from '../entities/task.entity';

export class ParentTaskDto extends Task {
  @ApiProperty({ format: 'uuid' })
  studentId!: string;

  @ApiProperty()
  studentFirstName!: string;

  @ApiProperty()
  studentLastName!: string;

  @ApiProperty({ example: 18, nullable: true })
  myRawScore!: number | null;

  @ApiProperty({ example: '18', nullable: true })
  myScaledScore!: string | null;

  @ApiProperty({ nullable: true })
  myFeedback!: string | null;

  @ApiProperty({ nullable: true })
  myGradedAt!: Date | null;

  @ApiProperty({ example: 'pending' })
  submissionStatus!: 'pending' | 'submitted' | 'late';

  @ApiProperty({ nullable: true })
  submissionContent!: string | null;

  @ApiProperty({ nullable: true })
  submittedAt!: Date | null;
}
