import { ApiProperty } from '@nestjs/swagger';

export class LinkedStudentDto {
  @ApiProperty({ example: 'student-uuid' })
  id!: string;

  @ApiProperty({ example: 'Jordy' })
  firstName!: string;

  @ApiProperty({ example: 'Espinoza' })
  lastName!: string;

  @ApiProperty({ example: 'alumno@gmail.com' })
  email!: string;

  @ApiProperty({ type: [String], example: ['class-1', 'class-2'] })
  classIds!: string[];
}
