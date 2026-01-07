import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateClientDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  // Telegram
  @IsString()
  @IsOptional()
  telegramId?: string;

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
