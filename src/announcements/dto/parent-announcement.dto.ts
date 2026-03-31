import { ApiProperty } from '@nestjs/swagger';
import { StudentAnnouncementDto } from './student-announcement.dto';

export class ParentAnnouncementDto extends StudentAnnouncementDto {
  @ApiProperty({ format: 'uuid' })
  studentId!: string;

  @ApiProperty({ example: 'Jordy' })
  studentFirstName!: string;

  @ApiProperty({ example: 'Espinoza' })
  studentLastName!: string;
}
