import { IsString, IsObject, IsBoolean, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDonationDto {
  @ApiProperty()
  @IsObject()
  title: Record<string, string>;

  @ApiProperty()
  @IsObject()
  description: Record<string, string>;

  @ApiProperty()
  @IsString()
  actionType: string;

  @ApiProperty()
  @IsString()
  actionData: string;

  @ApiProperty()
  @IsObject()
  actionLabel: Record<string, string>;

  @ApiProperty()
  @IsString()
  iconColor: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
