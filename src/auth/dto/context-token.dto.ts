import { ApiProperty } from '@nestjs/swagger';

export class ContextTokenDto {
  @ApiProperty()
  contextToken!: string;
}
