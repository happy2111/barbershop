import {
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateScheduleDto {
  @IsInt()
  @IsNotEmpty()
  specialistId: number;

  @IsInt()
  @Min(0)
  @Max(6)
  day_of_week: number;

  @IsString()
  @Matches(/^([0-1]\d|2[0-3]):[0-5]\d$/, {
    message: 'Invalid start_time format (HH:MM)',
  })
  start_time: string;

  @IsString()
  @Matches(/^([0-1]\d|2[0-3]):[0-5]\d$/, {
    message: 'Invalid end_time format (HH:MM)',
  })
  end_time: string;
}
