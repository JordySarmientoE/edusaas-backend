import { ApiProperty } from '@nestjs/swagger';

class FamilyLinkedUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Jordy' })
  firstName!: string;

  @ApiProperty({ example: 'Espinoza' })
  lastName!: string;

  @ApiProperty({ example: 'correo@gmail.com' })
  email!: string;
}

export class FamilyLinksDto {
  @ApiProperty({ type: [FamilyLinkedUserDto] })
  parents!: FamilyLinkedUserDto[];

  @ApiProperty({ type: [FamilyLinkedUserDto] })
  children!: FamilyLinkedUserDto[];
}
