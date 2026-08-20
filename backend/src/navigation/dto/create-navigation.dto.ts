import { IsInt, IsOptional, IsString, Matches, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsLocalizedText } from '../../common/dto/localized';

export class CreateNavigationDto {
  @ApiProperty({ example: { fr: 'Nos actions', en: 'Our actions' } })
  @IsLocalizedText({ maxLength: 80 })
  label: Record<string, string>;

  @ApiProperty({ example: '/nos-actions' })
  @IsString()
  @MaxLength(200)
  @Matches(/^(\/[A-Za-z0-9\-._~/]*|https?:\/\/\S+)$/, {
    message: 'Le lien doit être un chemin interne (/nos-actions) ou une URL http(s)',
  })
  href: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  parentId?: string;
}
