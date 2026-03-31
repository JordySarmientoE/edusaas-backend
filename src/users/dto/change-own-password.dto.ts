import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangeOwnPasswordDto {
  @ApiProperty({ example: 'ClaveActual123' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: 'NuevaClave123' })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
