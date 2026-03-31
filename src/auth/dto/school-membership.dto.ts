import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum';
import { SchoolMembershipStatus } from '../../users/entities/school-membership.entity';

export class SchoolMembershipDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  schoolId!: string;

  @ApiProperty({ enum: Role, enumName: 'Role' })
  role!: Role;

  @ApiProperty({ enum: SchoolMembershipStatus, enumName: 'SchoolMembershipStatus' })
  status!: SchoolMembershipStatus;

  @ApiPropertyOptional({ nullable: true })
  schoolName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  schoolSlug?: string | null;
}
