import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsLocalizedText } from '../../common/dto/localized';
import { PartialType } from '@nestjs/swagger';

export class CreateNewsCategoryDto {
  @ApiProperty({ example: { fr: 'Bilan annuel' } })
  @IsLocalizedText({ maxLength: 120 })
  name: Record<string, string>;

  @ApiPropertyOptional({ description: 'Generated from the name when omitted' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Le slug ne peut contenir que des minuscules, chiffres et tirets',
  })
  @IsOptional()
  slug?: string;
}

export class UpdateNewsCategoryDto extends PartialType(CreateNewsCategoryDto) {}
