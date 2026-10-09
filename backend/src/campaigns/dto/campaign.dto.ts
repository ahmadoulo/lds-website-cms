import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class AudienceDto {
  @IsIn(['all', 'fr', 'ar', 'period']) segment: 'all' | 'fr' | 'ar' | 'period';
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

/**
 * Blocks are an array checked block by block in the service, which knows
 * their shapes; class-validator only sees an array here.
 */
export class CampaignDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(160) name?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(200) subject?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(200) preheader?:
    string | null;
  @IsOptional() @IsArray() blocks?: unknown[];
  @IsOptional() @IsIn(['fr', 'ar']) locale?: 'fr' | 'ar';
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AudienceDto)
  audience?: AudienceDto;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) fromName?:
    string | null;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(254) replyTo?:
    string | null;
  @IsOptional() @IsBoolean() includeSignature?: boolean;
}

export class CampaignTestDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Adresse email invalide' })
  @MaxLength(254)
  to: string;
}

export class ScheduleDto {
  /** Absent or in the past: send now. */
  @IsOptional() @IsDateString() at?: string;

  /** The count the confirmation dialog showed. See CampaignsService.schedule. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  expectedRecipients: number;
}

export class ListDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}
