import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class AssignSchoolAdminDto {
  @ApiProperty({ example: 'director@colegio.com' })
  @IsEmail()
  email!: string;
}
