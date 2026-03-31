import { ApiProperty } from '@nestjs/swagger';

export class LogoUploadResponseDto {
  @ApiProperty({ example: '/uploads/logos/school-logo.png' })
  logoUrl!: string;
}
