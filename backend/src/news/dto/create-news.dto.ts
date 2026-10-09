import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsLocalizedText } from '../../common/dto/localized';

export class CreateNewsDto {
  @ApiProperty({ example: { fr: 'Retrospective 2026' } })
  @IsLocalizedText({ maxLength: 250 })
  title: Record<string, string>;

  @ApiPropertyOptional({ description: 'Generated from the title when omitted' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @MaxLength(200)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Le slug ne peut contenir que des minuscules, chiffres et tirets',
  })
  @IsOptional()
  slug?: string;

  @ApiProperty()
  @IsLocalizedText({ maxLength: 600 })
  excerpt: Record<string, string>;

  @ApiProperty({ description: 'HTML body' })
  @IsLocalizedText({ maxLength: 100000 })
  content: Record<string, string>;

  @ApiPropertyOptional({ description: 'Defaults to the general category' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  imageId?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  /**
   * When it goes public. Omitted when publishing: now. In the future: the
   * article is scheduled, and the public site waits for it.
   */
  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  publishedAt?: string;

  /** Archived articles leave every list but keep their address. */
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  archived?: boolean;

  // ------------------------------------------------------- announcement
  // All optional, and null clears a value: an ordinary article sends none.

  @ApiPropertyOptional() @IsDateString() @IsOptional() eventStartsAt?: string | null;
  @ApiPropertyOptional() @IsDateString() @IsOptional() eventEndsAt?: string | null;

  /** { fr, ar }, plain text. Checked and sanitised in the service. */
  @ApiPropertyOptional() @IsObject() @IsOptional() location?: Record<string, string> | null;
  @ApiPropertyOptional() @IsObject() @IsOptional() practicalInfo?: Record<string, string> | null;

  @ApiPropertyOptional() @IsDateString() @IsOptional() visibleFrom?: string | null;
  @ApiPropertyOptional() @IsDateString() @IsOptional() visibleUntil?: string | null;

  @ApiPropertyOptional() @IsBoolean() @IsOptional() showInBanner?: boolean;
  @ApiPropertyOptional() @IsObject() @IsOptional() bannerText?: Record<string, string> | null;
  @ApiPropertyOptional({ enum: ['home', 'all'] }) @IsIn(['home', 'all']) @IsOptional() bannerScope?: 'home' | 'all';
  @ApiPropertyOptional() @IsBoolean() @IsOptional() showInUpcoming?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isFeatured?: boolean;

  /** Validated action by action in the service. */
  @ApiPropertyOptional() @IsArray() @IsOptional() actions?: unknown[] | null;
  @ApiPropertyOptional() @IsObject() @IsOptional() contact?: Record<string, string> | null;
}
