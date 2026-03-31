import { ApiProperty } from '@nestjs/swagger';
import { AuthenticatedUserDto } from './authenticated-user.dto';
import { SchoolMembershipDto } from './school-membership.dto';

export class LoginResponseDto {
  @ApiProperty({ required: false, nullable: true })
  accessToken?: string | null;

  @ApiProperty({ required: false, nullable: true })
  refreshToken?: string | null;

  @ApiProperty({ type: AuthenticatedUserDto })
  user!: AuthenticatedUserDto;

  @ApiProperty({ type: SchoolMembershipDto, isArray: true })
  memberships!: SchoolMembershipDto[];

  @ApiProperty({ required: false, nullable: true })
  contextToken?: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  activeMembershipId!: string | null;

  @ApiProperty()
  requiresMembershipSelection!: boolean;
}
