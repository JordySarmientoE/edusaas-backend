import { ApiProperty } from '@nestjs/swagger';

export class ExportResponseDto {
  @ApiProperty({ example: 'users' })
  entity!: string;

  @ApiProperty({ example: 'csv' })
  format!: string;

  @ApiProperty({ description: 'Contenido serializado en base64' })
  contentBase64!: string;
}
