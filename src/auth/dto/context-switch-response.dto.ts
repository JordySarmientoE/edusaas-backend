import { ApiProperty } from '@nestjs/swagger';
import { SchoolMembershipDto } from './school-membership.dto';
import { TokenPairDto } from './token-pair.dto';

export class ContextSwitchResponseDto extends TokenPairDto {
  @ApiProperty({ format: 'uuid', nullable: true })
  activeMembershipId!: string | null;

  @ApiProperty({ type: SchoolMembershipDto, nullable: true })
  activeMembership!: SchoolMembershipDto | null;

  @ApiProperty()
  contextToken!: string;
}
