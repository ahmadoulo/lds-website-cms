import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsLocalizedText } from '../../common/dto/localized';

export class CreateImpactDto {
  @ApiProperty({ example: { fr: 'Kits scolaires distribues' } })
  @IsLocalizedText({ maxLength: 160 })
  label: Record<string, string>;

  @ApiProperty({ example: 620 })
  @IsInt({ message: 'La valeur doit être un nombre entier' })
  @Min(0)
  @Max(100000000)
  value: number;

  @ApiProperty({ example: '#87CE18' })
  @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
    message: 'La couleur doit être un code hexadécimal (#87CE18)',
  })
  color: string;

  @ApiPropertyOptional({ description: 'lucide-react icon name shown above the figure' })
  @IsString()
  @MaxLength(64)
  @IsOptional()
  icon?: string | null;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
