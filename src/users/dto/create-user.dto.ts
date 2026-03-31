import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class CreateUserDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsString()
  schoolId?: string | null;

  @ApiProperty({ example: 'Juan' })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Perez' })
  @IsString()
  lastName!: string;

  @ApiPropertyOptional({ example: '+51987654321' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ example: 'juan.perez@colegio.edu.pe' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Temporal123!' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ enum: Role, enumName: 'Role', example: Role.TEACHER })
  @IsEnum(Role)
  role!: Role;
}
