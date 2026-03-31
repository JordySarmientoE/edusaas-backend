import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Role } from '../../common/enums/role.enum';
import { SchoolMembershipStatus } from '../entities/school-membership.entity';

export class UserFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: Role, enumName: 'Role' })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ example: 'juan' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @ApiPropertyOptional({ enum: SchoolMembershipStatus, enumName: 'SchoolMembershipStatus' })
  @IsOptional()
  @IsEnum(SchoolMembershipStatus)
  status?: SchoolMembershipStatus;
}
