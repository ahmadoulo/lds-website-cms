import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsLocalizedText } from '../../common/dto/localized';

export class CreateMissionDto {
  @ApiProperty({ example: { fr: 'Education' } })
  @IsLocalizedText({ maxLength: 160 })
  title: Record<string, string>;

  @ApiProperty()
  @IsLocalizedText({ maxLength: 1200 })
  description: Record<string, string>;

  @ApiPropertyOptional({ description: 'lucide-react icon name' })
  @IsString()
  @MaxLength(64)
  @IsOptional()
  icon?: string;

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
  imageId?: string;
}
