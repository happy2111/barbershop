import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class RevenueQueryDto {
  @IsEnum(['today', 'week', 'month'])
  @IsOptional()
  period?: 'today' | 'week' | 'month';
}

export class GraphQueryDto {
  @IsInt()
  @Min(7)
  @Max(365)
  @IsOptional()
  days?: number;
}

export class SpecialistsLoadQueryDto {
  @IsEnum(['week', 'month'])
  @IsOptional()
  period?: 'week' | 'month';
}

export class PopularServicesQueryDto {
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  top?: number;

  @IsEnum(['count', 'revenue'])
  @IsOptional()
  type?: 'count' | 'revenue';

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
