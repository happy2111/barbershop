import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsNumber()
  price: number;

  @IsInt()
  @Min(1)
  duration_min: number;

  @IsInt()
  categoryId: number;

  @IsOptional()
  @IsString()
  photo?: string;
}
