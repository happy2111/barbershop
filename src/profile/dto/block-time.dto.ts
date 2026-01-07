import { IsDateString, IsOptional, IsString, Matches } from 'class-validator';

export class BlockTimeDto {
  @IsDateString()
  date: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  start_time: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  end_time: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
