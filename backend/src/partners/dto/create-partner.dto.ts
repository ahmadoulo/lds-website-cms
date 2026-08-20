import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePartnerDto {
  @ApiProperty()
  @IsString()
  @MinLength(2, { message: 'Le nom du partenaire est requis' })
  @MaxLength(160)
  name: string;

  @ApiPropertyOptional({ description: 'lucide-react icon name, used when no logo is uploaded' })
  @IsString()
  @MaxLength(64)
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ description: 'null clears an existing link' })
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsUrl({ require_protocol: true }, { message: 'Le lien doit être une URL valide (https://...)' })
  @IsOptional()
  url?: string | null;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  logoId?: string;
}
