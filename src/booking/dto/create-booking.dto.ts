import  { IsInt, IsDateString, IsString, IsEnum } from 'class-validator';
import { BookingStatus } from '@prisma/client';

export class CreateBookingDto {
  @IsInt()
  clientId: number;

  @IsInt()
  specialistId: number;

  @IsInt({ each: true })
  serviceIds: number[];

  @IsDateString()
  date: string;

  @IsString()
  start_time: string;

  @IsEnum(BookingStatus)
  status?: BookingStatus = BookingStatus.PENDING;
}
