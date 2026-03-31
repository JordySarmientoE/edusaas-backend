import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class CompleteLoginContextDto {
  @ApiProperty()
  @IsString()
  contextToken!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  membershipId!: string;
}
