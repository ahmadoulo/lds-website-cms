import { IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsLocalizedText } from '../../common/dto/localized';

export class UpdateMediaDto {
  @ApiPropertyOptional({ description: 'Accessible description of the image' })
  @IsLocalizedText({ requireFr: false, maxLength: 300 })
  @IsOptional()
  altText?: Record<string, string>;
}
