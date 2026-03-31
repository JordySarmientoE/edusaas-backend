import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class SchoolFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'san martin' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;
}
