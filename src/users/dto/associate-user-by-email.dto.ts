import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class AssociateUserByEmailDto {
  @ApiProperty({ example: 'parent@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: Role, enumName: 'Role', example: Role.PARENT })
  @IsEnum(Role)
  role!: Role;

  @ApiPropertyOptional({ example: 'Invitacion para apoderado del colegio' })
  @IsOptional()
  @IsString()
  note?: string;
}
