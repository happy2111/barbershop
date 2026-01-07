import { IsOptional, IsString, IsUrl, Length } from 'class-validator';

export class UpdateSpecialistDto {
  @IsOptional()
  @IsString()
  @Length(2, 50)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  skills?: string;

  @IsOptional()
  @IsUrl()
  photo?: string;
}
