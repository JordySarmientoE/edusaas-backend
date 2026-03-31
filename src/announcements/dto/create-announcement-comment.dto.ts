import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateAnnouncementCommentDto {
  @ApiProperty({ example: 'Profesor, faltan las PPT de la última clase.' })
  @IsString()
  message!: string;
}
