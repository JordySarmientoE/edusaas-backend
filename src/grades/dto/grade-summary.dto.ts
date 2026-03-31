import { ApiProperty } from '@nestjs/swagger';

export class GradeSummaryConfigDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  classId!: string;

  @ApiProperty({ format: 'uuid' })
  cycleId!: string;

  @ApiProperty()
  examsWeight!: number;

  @ApiProperty()
  participationsWeight!: number;

  @ApiProperty()
  tasksWeight!: number;

  @ApiProperty()
  passingScore!: number;

  @ApiProperty()
  minimumAttendancePercentage!: number;

  @ApiProperty()
  isClosed!: boolean;
}

export class GradeSummaryStudentDto {
  @ApiProperty({ format: 'uuid' })
  studentId!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  examsAverage!: number;

  @ApiProperty()
  participationsAverage!: number;

  @ApiProperty()
  tasksAverage!: number;

  @ApiProperty()
  finalScore!: number;

  @ApiProperty()
  finalScaledScore!: string;

  @ApiProperty()
  gradedActivities!: number;

  @ApiProperty({ nullable: true })
  latestFeedback!: string | null;

  @ApiProperty({ nullable: true })
  latestFeedbackTaskTitle!: string | null;

  @ApiProperty()
  attendedRecords!: number;

  @ApiProperty()
  totalAttendanceRecords!: number;

  @ApiProperty()
  attendancePercentage!: number;

  @ApiProperty({ enum: ['passed', 'failed', 'failed_attendance', 'failed_both'] })
  status!: 'passed' | 'failed' | 'failed_attendance' | 'failed_both';
}

export class GradeClassSummaryDto {
  @ApiProperty({ format: 'uuid' })
  classId!: string;

  @ApiProperty({ format: 'uuid' })
  cycleId!: string;

  @ApiProperty({ type: GradeSummaryConfigDto })
  config!: GradeSummaryConfigDto;

  @ApiProperty({ type: GradeSummaryStudentDto, isArray: true })
  students!: GradeSummaryStudentDto[];
}

export class ParentGradeSummaryDto extends GradeClassSummaryDto {
  @ApiProperty({ format: 'uuid' })
  studentId!: string;

  @ApiProperty()
  studentFirstName!: string;

  @ApiProperty()
  studentLastName!: string;
}
