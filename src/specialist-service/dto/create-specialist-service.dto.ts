import { IsInt, IsNotEmpty } from 'class-validator';

export class CreateSpecialistServiceDto {
  @IsInt()
  @IsNotEmpty()
  specialistId: number;

  @IsInt()
  @IsNotEmpty()
  serviceId: number;
}
