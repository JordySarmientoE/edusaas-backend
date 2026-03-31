import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateSchoolDto {
  @ApiProperty({ example: 'Colegio San Martin' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: 'colegio-san-martin' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  @MaxLength(150)
  slug!: string;

  @ApiPropertyOptional({ example: 'direccion@colegio.edu.pe' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;
}
