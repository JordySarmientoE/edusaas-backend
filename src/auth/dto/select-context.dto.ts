import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SelectContextDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  membershipId!: string;
}
