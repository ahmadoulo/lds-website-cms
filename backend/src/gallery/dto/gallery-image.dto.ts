import { IsInt, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsLocalizedText } from '../../common/dto/localized';

export class AddGalleryImageDto {
  @ApiProperty({ description: 'Id of an already uploaded Media record' })
  @IsUUID()
  mediaId: string;

  @ApiPropertyOptional()
  @IsLocalizedText({ requireFr: false, maxLength: 300 })
  @IsOptional()
  caption?: Record<string, string>;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  order?: number;
}

export class UpdateGalleryImageDto {
  @ApiPropertyOptional()
  @IsLocalizedText({ requireFr: false, maxLength: 300 })
  @IsOptional()
  caption?: Record<string, string>;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  order?: number;
}
