import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  // Basic phone format, customize as needed
  @Matches(/^[0-9+\-()\s]{6,20}$/)
  phone!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
