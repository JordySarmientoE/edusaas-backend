import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum';
import { SchoolMembershipStatus } from '../entities/school-membership.entity';

export class AdminUserMembershipDto {
  @ApiProperty({ format: 'uuid' })
  membershipId!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ format: 'uuid' })
  schoolId!: string;

  @ApiProperty({ enum: Role, enumName: 'Role' })
  role!: Role;

  @ApiProperty({ enum: SchoolMembershipStatus, enumName: 'SchoolMembershipStatus' })
  status!: SchoolMembershipStatus;

  @ApiProperty({ example: 'Juan' })
  firstName!: string;

  @ApiProperty({ example: 'Perez' })
  lastName!: string;

  @ApiPropertyOptional({ example: '+51987654321', nullable: true })
  phoneNumber!: string | null;

  @ApiProperty({ example: 'juan.perez@colegio.edu.pe' })
  email!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional({ example: 'Colegio San Martin', nullable: true })
  schoolName?: string | null;

  @ApiPropertyOptional({
    type: [Object],
    nullable: true,
    example: [{ id: 'student-uuid', firstName: 'Jordy', lastName: 'Espinoza', email: 'alumno@gmail.com' }]
  })
  linkedStudents?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  }>;

  @ApiPropertyOptional({
    type: [Object],
    nullable: true,
    example: [{ id: 'parent-uuid', firstName: 'María', lastName: 'Lopez', email: 'madre@gmail.com' }]
  })
  linkedParents?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  }>;
}
