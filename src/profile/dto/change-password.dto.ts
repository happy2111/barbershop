import {IsNotEmpty, IsString, Length, Matches} from "class-validator";

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 128, {
    message: 'Пароль должен быть не менее 8 и не более 128 символов.',
  })
  @Matches(/^(?=.*[A-Z])(?=.*\d).{8,255}$/, {
    message: 'Пароль должен содержать минимум одну заглавную букву (A-Z) и минимум одну цифру (0-9).',
  })
  newPassword: string;
}

