import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class UpdateScheduleDto {
  @IsInt()
  @Min(0)
  @Max(6)
  @IsOptional()
  day_of_week?: number;

  @IsString()
  @Matches(/^([0-1]\d|2[0-3]):[0-5]\d$/, { message: 'Invalid start_time format (HH:MM)' })
  @IsOptional()
  start_time?: string;

  @IsString()
  @Matches(/^([0-1]\d|2[0-3]):[0-5]\d$/, { message: 'Invalid end_time format (HH:MM)' })
  @IsOptional()
  end_time?: string;
}
