import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignTeacherDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  teacherId!: string;
}
