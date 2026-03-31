import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SubmitTaskDto {
  @ApiPropertyOptional({ example: 'Adjunto mi desarrollo del trabajo y observaciones finales.' })
  @IsOptional()
  @IsString()
  content?: string;
}
