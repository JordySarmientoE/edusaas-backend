import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum';

export class AuthenticatedUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'admin@edusaas.com' })
  email!: string;

  @ApiProperty({ enum: Role, enumName: 'Role', nullable: true })
  role!: Role | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  schoolId!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  membershipId!: string | null;

  @ApiProperty({ nullable: true })
  avatarUrl!: string | null;
}
