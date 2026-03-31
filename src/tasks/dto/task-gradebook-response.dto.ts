import { ApiProperty } from '@nestjs/swagger';
import { Task } from '../entities/task.entity';
import { TaskGradebookStudentDto } from './task-gradebook-student.dto';

export class TaskGradebookResponseDto {
  @ApiProperty({ type: Task })
  task!: Task;

  @ApiProperty({ type: [TaskGradebookStudentDto] })
  students!: TaskGradebookStudentDto[];
}
