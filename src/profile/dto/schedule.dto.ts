import { IsInt, IsString, Matches, Min, Max } from 'class-validator';

export class CreateScheduleDto {
  @IsInt()
  @Min(0)
  @Max(6)
  day_of_week: number; // 0 = воскресенье, 1 = понедельник ...

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'start_time must be HH:MM' })
  start_time: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'end_time must be HH:MM' })
  end_time: string;
}

export class UpdateScheduleDto extends CreateScheduleDto {}