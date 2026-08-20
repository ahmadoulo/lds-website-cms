import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateContactDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: "Merci d'indiquer votre nom" })
  @MaxLength(120)
  name: string;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Adresse email invalide' })
  @MaxLength(180)
  email: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'Merci de préciser un sujet' })
  @MaxLength(200)
  subject: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(10, { message: 'Votre message doit contenir au moins 10 caractères' })
  @MaxLength(5000)
  message: string;
}
