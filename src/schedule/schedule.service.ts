import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateScheduleDto) {
    // Проверка что мастер существует
    const specialist = await this.prisma.specialist.findUnique({
      where: { id: dto.specialistId },
    });
    if (!specialist) throw new NotFoundException('Specialist not found');

    // Проверка что день недели уникален
    const exists = await this.prisma.schedule.findFirst({
      where: {
        specialistId: dto.specialistId,
        day_of_week: dto.day_of_week,
      },
    });
    if (exists)
      throw new BadRequestException(
        'This day is already scheduled for this specialist',
      );

    // Проверка корректности времени
    if (dto.start_time >= dto.end_time)
      throw new BadRequestException('start_time must be < end_time');

    return this.prisma.schedule.create({
      data: dto,
      include: { specialist: true },
    });
  }

  async findAll() {
    return this.prisma.schedule.findMany({
      include: { specialist: true },
      orderBy: [{ specialistId: 'asc' }, { day_of_week: 'asc' }],
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.schedule.findUnique({
      where: { id },
      include: { specialist: true },
    });
    if (!item) throw new NotFoundException('Schedule not found');
    return item;
  }

  async update(id: number, dto: UpdateScheduleDto) {
    const existing = await this.findOne(id);

    // Проверка если хотят поменять день недели
    if (dto.day_of_week !== undefined) {
      const duplicate = await this.prisma.schedule.findFirst({
        where: {
          specialistId: existing.specialistId,
          day_of_week: dto.day_of_week,
          NOT: { id },
        },
      });

      if (duplicate)
        throw new BadRequestException(
          'This day is already scheduled for this specialist',
        );
    }

    // Проверка времени
    const newStart = dto.start_time ?? existing.start_time;
    const newEnd = dto.end_time ?? existing.end_time;
    if (newStart >= newEnd)
      throw new BadRequestException('start_time must be < end_time');

    return this.prisma.schedule.update({
      where: { id },
      data: dto,
      include: { specialist: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.schedule.delete({ where: { id } });
  }

  // Получить график одного специалиста
  async findBySpecialist(specialistId: number) {
    return this.prisma.schedule.findMany({
      where: { specialistId },
      orderBy: { day_of_week: 'asc' },
    });
  }
}
