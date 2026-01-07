import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RevenueQueryDto {
  @IsEnum(['today', 'week', 'month'])
  @IsOptional()
  period?: 'today' | 'week' | 'month';
}

export class GraphQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(7)
  @Max(365)
  @IsOptional()
  days?: number;
}

export class BookingsCountQueryDto {
  @IsEnum(['today', 'tomorrow', 'month'])
  @IsOptional()
  period?: 'today' | 'tomorrow' | 'month';
}

export class SpecialistsLoadQueryDto {
  @IsEnum(['week', 'month'])
  @IsOptional()
  period?: 'week' | 'month';
}

export class PopularServicesQueryDto {
  @Type(() => Number) // <--- Add this decorator
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  top?: number = 5; // You can also set a default value here

  @IsEnum(['count', 'revenue'])
  @IsOptional()
  type?: 'count' | 'revenue';

  @IsEnum(['month'])
  @IsOptional()
  period?: 'month';
}

export class LostMoneyQueryDto {
  @IsEnum(['month'])
  @IsOptional()
  period?: 'month';
}

export class RepeatClientsQueryDto {
  @IsEnum(['month'])
  @IsOptional()
  period?: 'month';
}

export class BestSpecialistQueryDto {
  @IsEnum(['revenue', 'clients'])
  @IsOptional()
  type?: 'revenue' | 'clients';

  @IsEnum(['month'])
  @IsOptional()
  period?: 'month';
}

export class AverageCheckQueryDto {
  @IsEnum(['month'])
  @IsOptional()
  period?: 'month';
}

export class PeakHoursQueryDto {
  @IsEnum(['month'])
  @IsOptional()
  period?: 'month';
}
