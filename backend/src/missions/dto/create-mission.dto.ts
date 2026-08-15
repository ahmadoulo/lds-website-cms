import { IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMissionDto {
  @ApiProperty({ description: 'JSON object with translations (fr, en)' })
  @IsNotEmpty()
  title: any;

  @ApiProperty({ description: 'JSON object with translations (fr, en)' })
  @IsNotEmpty()
  description: any;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  order?: number;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  imageId?: string;
}
