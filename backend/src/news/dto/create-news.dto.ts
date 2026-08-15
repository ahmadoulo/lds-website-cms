import { IsString, IsObject, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNewsDto {
  @ApiProperty({ description: 'JSON object for title in multiple languages' })
  @IsObject()
  title: Record<string, string>;

  @ApiProperty()
  @IsString()
  slug: string;

  @ApiProperty({ description: 'JSON object for excerpt' })
  @IsObject()
  excerpt: Record<string, string>;

  @ApiProperty({ description: 'JSON object for rich text content' })
  @IsObject()
  content: Record<string, string>;

  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  imageId?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
