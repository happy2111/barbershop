import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateClientDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  // Telegram
  @IsString()
  @IsOptional()
  telegramId?: string; // BigInt → string

  @IsString()
  @IsOptional()
  @MaxLength(255)
  telegramUsername?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  telegramFirstName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  telegramLastName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  telegramLang?: string;
}
