import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsLocalizedText } from '../../common/dto/localized';

export const DONATION_ACTION_TYPES = ['phone', 'link', 'contact', 'email'] as const;
export const DONATION_COLORS = ['orange', 'blue', 'green', 'navy'] as const;
export const DONATION_PROVIDERS = ['wave', 'orange_money', 'bank', 'cash', 'other'] as const;

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

  @ApiPropertyOptional({ enum: DONATION_PROVIDERS })
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsIn(DONATION_PROVIDERS as unknown as string[], {
    message: 'Fournisseur invalide (wave, orange_money, bank, cash, other)',
  })
  @IsOptional()
  provider?: string | null;

  @ApiPropertyOptional({ description: 'Account holder, shown to the donor' })
  @IsString()
  @MaxLength(160)
  @IsOptional()
  beneficiary?: string | null;

  @ApiPropertyOptional({ description: 'Official payment link, if the association has one' })
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsUrl({ require_protocol: true }, { message: 'Le lien de paiement doit être une URL https://' })
  @IsOptional()
  paymentLink?: string | null;
}
