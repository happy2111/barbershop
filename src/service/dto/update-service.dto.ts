  import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

  export class UpdateServiceDto {
    @IsString()
    @IsOptional()
    @MaxLength(255)
    name?: string;

    @IsNumber()
    @IsOptional()
    price?: number;

    @IsInt()
    @Min(1)
    @IsOptional()
    duration_min?: number;

    @IsInt()
    @IsOptional()
    categoryId?: number;

    @IsOptional()
    @IsString()
    photo?: string;
  }
