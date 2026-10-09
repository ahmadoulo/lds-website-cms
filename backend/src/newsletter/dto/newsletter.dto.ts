import { Transform, Type } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SubscriberStatus } from '@prisma/client';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class SubscribeDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Adresse email invalide' })
  @MaxLength(254)
  email: string;

  /** Must be ticked. An unticked box is not consent, whatever else is sent. */
  @IsBoolean()
  @Equals(true, { message: 'Le consentement est nécessaire.' })
  consent: boolean;

  @IsOptional() @IsIn(['fr', 'ar']) locale?: 'fr' | 'ar';

  @IsOptional() @IsIn(['footer', 'page']) source?: 'footer' | 'page';

  /** The honeypot. Hidden from people; a bot fills it. */
  @IsOptional() @IsString() @MaxLength(200) website?: string;
}

export class ConfirmDto {
  @IsString() @MaxLength(200) token: string;
}

export class UnsubscribeDto {
  @IsString() @MaxLength(64) s: string;
  @IsString() @MaxLength(200) t: string;
  @IsOptional() @IsString() @MaxLength(64) c?: string;
}

export class SubscriberQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(254) search?: string;
  @IsOptional() @IsEnum(SubscriberStatus) status?: SubscriberStatus;
  @IsOptional() @IsIn(['fr', 'ar']) locale?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class ImportDto {
  /** At most a few thousand lines: one address per line, an optional language after it. */
  @IsString() @MaxLength(300_000) csv: string;

  /** The administrator states the people on the list agreed to it. */
  @IsBoolean()
  @Equals(true, {
    message: 'Attestez le consentement des personnes importées.',
  })
  attest: boolean;
}
