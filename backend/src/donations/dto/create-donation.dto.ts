import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsLocalizedText } from '../../common/dto/localized';

export const DONATION_ACTION_TYPES = ['phone', 'link', 'contact', 'email'] as const;
export const DONATION_COLORS = ['orange', 'blue', 'green', 'navy'] as const;

export class CreateDonationDto {
  @ApiProperty({ example: { fr: 'Faire un don financier' } })
  @IsLocalizedText({ maxLength: 160 })
  title: Record<string, string>;

  @ApiProperty()
  @IsLocalizedText({ maxLength: 800 })
  description: Record<string, string>;

  @ApiProperty({ enum: DONATION_ACTION_TYPES })
  @IsIn(DONATION_ACTION_TYPES as unknown as string[], {
    message: "Type d'action invalide (phone, link, contact, email)",
  })
  actionType: string;

  @ApiProperty({ example: '+221 77 861 32 02' })
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  actionData: string;

  @ApiProperty()
  @IsLocalizedText({ maxLength: 120 })
  actionLabel: Record<string, string>;

  @ApiProperty({ enum: DONATION_COLORS })
  @IsIn(DONATION_COLORS as unknown as string[], { message: 'Couleur invalide' })
  iconColor: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
