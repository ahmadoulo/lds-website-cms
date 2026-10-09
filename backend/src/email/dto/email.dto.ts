import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { EmailStatus } from '@prisma/client';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Every field optional: the form saves what it shows. Blank strings clear a
 * value; `password` absent keeps the stored one, '' removes it.
 */
export class UpdateEmailSettingsDto {
  @IsOptional() @IsBoolean() enabled?: boolean;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(255) host?:
    string | null;

  @IsOptional() @IsInt() @Min(1) @Max(65535) port?: number | null;

  @IsOptional() @IsIn(['tls', 'starttls', 'none']) security?:
    'tls' | 'starttls' | 'none';

  @IsOptional() @Transform(trim) @IsString() @MaxLength(255) username?:
    string | null;

  /** Write-only. Never present in any response. */
  @IsOptional() @IsString() @MaxLength(1024) password?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) fromName?:
    string | null;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(254) fromEmail?:
    string | null;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) replyToName?:
    string | null;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(254) replyToEmail?:
    string | null;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(254) contactInbox?:
    string | null;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(254) adminInbox?:
    string | null;

  /** Validated field by field in the service, which knows the purposes. */
  @IsOptional() @IsObject() identities?: Record<
    string,
    Record<string, string>
  > | null;

  @IsOptional() @IsInt() @Min(1) @Max(200) batchSize?: number;
  @IsOptional() @IsInt() @Min(1) @Max(1000) ratePerMinute?: number;

  /** Normalised and checked to be a bare http(s) origin in the service. */
  @IsOptional() @Transform(trim) @IsString() @MaxLength(255) siteUrl?:
    string | null;

  @IsOptional() @IsObject() signature?: Record<string, string>;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(500) privacyPolicyUrl?:
    string | null;
}

export class SendTestDto {
  @ApiProperty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Adresse email invalide' })
  @MaxLength(254)
  to: string;

  @ApiPropertyOptional({ enum: ['fr', 'ar'] })
  @IsOptional()
  @IsIn(['fr', 'ar'])
  locale?: 'fr' | 'ar';
}

export class UpdateTemplateDto {
  @IsOptional() @IsObject() subject?: Record<string, string>;
  @IsOptional() @IsObject() html?: Record<string, string>;
  @IsOptional() @IsObject() text?: Record<string, string>;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class PreviewTemplateDto {
  @IsOptional() @IsIn(['fr', 'ar']) locale?: 'fr' | 'ar';
  /** Unsaved text to preview, so the editor shows what it is about to save. */
  @IsOptional() @IsObject() subject?: Record<string, string>;
  @IsOptional() @IsObject() html?: Record<string, string>;
  @IsOptional() @IsObject() text?: Record<string, string>;
}

export class HistoryQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsEnum(EmailStatus) status?: EmailStatus;
  @IsOptional() @IsString() @MaxLength(40) kind?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(254) search?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}
