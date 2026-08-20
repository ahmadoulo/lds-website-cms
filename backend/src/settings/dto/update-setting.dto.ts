import { IsNotEmpty, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSettingDto {
  @ApiProperty({ description: 'Arbitrary JSON payload for this settings key' })
  @IsObject({ message: 'La valeur doit être un objet JSON' })
  @IsNotEmpty()
  value: Record<string, any>;
}
