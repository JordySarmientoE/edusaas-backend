import { ApiProperty } from '@nestjs/swagger';

export class AnnouncementCommentDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  announcementId!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ example: 'Jordy' })
  firstName!: string;

  @ApiProperty({ example: 'Espinoza' })
  lastName!: string;

  @ApiProperty({ example: 'teacher@gmail.com' })
  email!: string;

  @ApiProperty({ example: 'teacher' })
  role!: string;

  @ApiProperty({ example: 'Profesor, faltan las PPT de la última clase.' })
  message!: string;

  @ApiProperty()
  createdAt!: Date;
}
