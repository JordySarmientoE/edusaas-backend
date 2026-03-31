import { IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAuditLogDto {
  @IsOptional()
  @IsUUID()
  userId?: string | null;

  @IsString()
  @MaxLength(100)
  action!: string;

  @IsString()
  @MaxLength(100)
  entityType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityId?: string | null;

  @IsOptional()
  @IsUUID()
  schoolId?: string | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
