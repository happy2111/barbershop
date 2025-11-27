import { IsInt, IsOptional } from 'class-validator';

export class UpdateSpecialistServiceDto {
  @IsInt()
  @IsOptional()
  specialistId?: number;

  @IsInt()
  @IsOptional()
  serviceId?: number;
}
