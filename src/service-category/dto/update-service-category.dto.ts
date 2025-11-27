import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateServiceCategoryDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;
}
