import { IsBoolean, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
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
}
