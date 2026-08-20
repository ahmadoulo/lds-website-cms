import { IsBoolean, IsInt, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsLocalizedText } from '../../common/dto/localized';

export class CreateGalleryAlbumDto {
  @ApiProperty({ example: { fr: 'Distribution de kits scolaires 2026' } })
  @IsLocalizedText({ maxLength: 200 })
  title: Record<string, string>;

  @ApiPropertyOptional()
  @IsLocalizedText({ requireFr: false, maxLength: 2000 })
  @IsOptional()
  description?: Record<string, string>;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
