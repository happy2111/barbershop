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

  async getFreeSlots(specialistId: number, serviceId: number, date: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service) return [];

    const duration = service.duration_min;

    // Преобразуем дату в начало дня (00:00:00) в UTC
    const dayStart = new Date(`${date}T00:00:00.000Z`);

    // Проверяем, что дата валидная
    if (isNaN(dayStart.getTime())) {
      throw new Error('Invalid date format. Expected YYYY-MM-DD');
    }

    const schedule = await this.prisma.schedule.findFirst({
      where: {
        specialistId,
        day_of_week: dayStart.getUTCDay() // или getDay() — зависит от твоей логики
      },
    });

    if (!schedule) return [];

    // Ищем брони ТОЛЬКО на эту дату (с 00:00:00 до 23:59:59.999)
    const bookings = await this.prisma.booking.findMany({
      where: {
        specialistId,
        date: {
          gte: dayStart,                              // >= 2025-12-26 00:00:00
          lt: new Date(`${date}T23:59:59.999Z`),      // <  2025-12-27 00:00:00
        },
      },
    });

    const bookedRanges = bookings.map((b) => ({
      start: b.start_time,
      end: b.end_time,
    }));

    return this.generateSlots(schedule.start_time, schedule.end_time, duration, bookedRanges);
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


  generateSlots(start: string, end: string, duration: number, booked: any[]) {
    const slots: any = [];
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);

    let current = sh * 60 + sm;
    const endMin = eh * 60 + em;

    while (current + duration <= endMin) {
      const slotStart = current;
      const slotEnd = current + duration;

      const formattedStart = this.toTime(slotStart);
      const formattedEnd = this.toTime(slotEnd);

      const overlap = booked.some((b) =>
        !(slotEnd <= this.toMinutes(b.start) || slotStart >= this.toMinutes(b.end))
      );

      if (!overlap) {
        slots.push({
          start: formattedStart,
          end: formattedEnd,
        });
      }

      current += duration;
    }

    return slots;
  }

  toMinutes(t: string) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }

  toTime(m: number) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }
}
