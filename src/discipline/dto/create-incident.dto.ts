import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsUUID } from 'class-validator';
import { IncidentSeverity } from '../entities/incident.entity';

export class CreateIncidentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId!: string;

  @ApiProperty({ enum: IncidentSeverity, enumName: 'IncidentSeverity' })
  @IsEnum(IncidentSeverity)
  severity!: IncidentSeverity;

  @ApiProperty({ example: 'Interrupcion reiterada de la clase.' })
  @IsString()
  description!: string;
}
