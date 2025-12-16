  import { IsOptional, IsString, MinLength } from 'class-validator';

  export class UpdateMeDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    name?: string;

    @IsOptional()
    @IsString()
    photo?: string | null;

    @IsOptional()
    @IsString()
    description?: string | null;

    @IsOptional()
    @IsString()
    skills?: string | null;

    @IsOptional()
    @IsString()
    @MinLength(6)
    password?: string;
  }
