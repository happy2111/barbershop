import { IsString, IsNotEmpty, Matches, IsInt } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9+\-()\s]{6,20}$/)
  phone!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  hostname?: string;
}
