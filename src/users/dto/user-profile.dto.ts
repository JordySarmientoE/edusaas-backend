import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Jordy' })
  firstName!: string;

  @ApiProperty({ example: 'Espinoza' })
  lastName!: string;

  @ApiPropertyOptional({ example: '+51987654321', nullable: true })
  phoneNumber!: string | null;

  @ApiProperty({ example: 'jordy@gmail.com' })
  email!: string;

  @ApiPropertyOptional({ example: '/uploads/avatars/jordy.png', nullable: true })
  avatarUrl!: string | null;
}
