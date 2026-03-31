import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { IncidentSeverity } from '../entities/incident.entity';

export class UpdateIncidentDto {
  @ApiPropertyOptional({ enum: IncidentSeverity, enumName: 'IncidentSeverity' })
  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity?: IncidentSeverity;

  @ApiPropertyOptional({ example: 'Conducta corregida y comunicada a la familia.' })
  @IsOptional()
  @IsString()
  description?: string;
}
