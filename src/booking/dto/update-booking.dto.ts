import { IsInt, IsOptional, IsDateString, IsString, IsEnum } from 'class-validator';
import { BookingStatus } from '@prisma/client';

export class UpdateBookingDto {
  @IsOptional()
  @IsInt()
  clientId?: number;

  @IsOptional()
  @IsInt()
  specialistId?: number;

  @IsOptional()
  @IsInt({ each: true })
  serviceIds?: number[];

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  start_time?: string;

  @IsOptional()
  @IsString()
  end_time?: string;

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
