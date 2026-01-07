import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateSpecialistDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @Matches(/^[0-9+\-()\s]{6,20}$/)
  @MinLength(6)
  phone!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsEnum(['ADMIN', 'SPECIALIST'], {
    message: 'role must be ADMIN or SPECIALIST',
  } as any)
  role?: 'ADMIN' | 'SPECIALIST';

  @IsOptional()
  @IsString()
  photo?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  skills?: string | null;
}
