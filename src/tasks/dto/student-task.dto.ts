import { ApiPropertyOptional } from '@nestjs/swagger';
import { Task } from '../entities/task.entity';

export class StudentTaskDto extends Task {
  @ApiPropertyOptional({ example: 18, nullable: true })
  myRawScore!: number | null;

  @ApiPropertyOptional({ example: '18', nullable: true })
  myScaledScore!: string | null;

  @ApiPropertyOptional({ example: 'Buen trabajo', nullable: true })
  myFeedback!: string | null;

  @ApiPropertyOptional({ example: '2026-03-30T18:20:00.000Z', nullable: true })
  myGradedAt!: Date | null;
}
