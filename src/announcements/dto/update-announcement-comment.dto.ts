import { PartialType } from '@nestjs/swagger';
import { CreateAnnouncementCommentDto } from './create-announcement-comment.dto';

export class UpdateAnnouncementCommentDto extends PartialType(CreateAnnouncementCommentDto) {}
