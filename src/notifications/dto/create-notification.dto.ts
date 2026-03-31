import { IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateNotificationDto {
  @IsUUID()
  schoolId!: string;

  @IsUUID()
  userId!: string;

  @IsString()
  @MaxLength(180)
  title!: string;

  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  type?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
