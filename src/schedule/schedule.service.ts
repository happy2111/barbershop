import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

type BookingRange = { start: string; end: string };

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateScheduleDto, hostname: string) {
    const company = await this.prisma.company.findUnique({
      where: { domain: hostname },
    });
    if (!company) throw new NotFoundException('Company not found');

    const specialist = await this.prisma.specialist.findFirst({
      where: { id: dto.specialistId, companyId: company.id },
    });
    if (!specialist)
      throw new NotFoundException('Specialist not found in this company');

    const exists = await this.prisma.schedule.findFirst({
      where: {
        specialistId: dto.specialistId,
        day_of_week: dto.day_of_week,
        specialist: { companyId: company.id },
      },
    });
    if (exists)
      throw new BadRequestException(
        'This day is already scheduled for this specialist',
      );

    if (dto.start_time >= dto.end_time)
      throw new BadRequestException('start_time must be < end_time');

    return this.prisma.schedule.create({
      data: {
        ...dto,
        companyId: company.id,
      },
      include: { specialist: true },
    });
  }
  async getFreeSlots(
    specialistId: number,
    serviceId: number,
    date: string,
    companyId: number,
  ) {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, companyId },
    });
    if (!service) return [];

    const duration = service.duration_min;
    const dayStart = new Date(`${date}T00:00:00.000Z`);

    if (isNaN(dayStart.getTime())) {
      throw new Error('Invalid date format. Expected YYYY-MM-DD');
    }

    const schedule = await this.prisma.schedule.findFirst({
      where: {
        specialistId,
        specialist: { companyId },
        day_of_week: dayStart.getUTCDay(),
      },
    });
    if (!schedule) return [];

    const bookings = await this.prisma.booking.findMany({
      where: {
        specialistId,
        companyId,
        date: {
          gte: dayStart,
          lt: new Date(`${date}T23:59:59.999Z`),
        },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    const bookedRanges = bookings.map((b) => ({
      start: b.start_time,
      end: b.end_time,
    }));

    // Генерируем все возможные слоты
    const allSlots = this.generateSlots(
      schedule.start_time,
      schedule.end_time,
      duration,
      bookedRanges,
    );

    // --- ЛОГИКА ФИЛЬТРАЦИИ ПО ТЕКУЩЕМУ ВРЕМЕНИ ---

    // Получаем текущее время в Ташкенте (UTC+5)
    const now = new Date();
    const tashkentOffset = 5 * 60; // 5 часов в минутах
    const nowInTashkent = new Date(now.getTime() + (now.getTimezoneOffset() + tashkentOffset) * 60000);

    const todayString = nowInTashkent.toISOString().split('T')[0];

    // Если запрашиваемая дата — это сегодня
    if (date === todayString) {
      const currentWaitTime = nowInTashkent.getHours() * 60 + nowInTashkent.getMinutes();

      return allSlots.filter(slot => {
        const [hours, minutes] = slot.start.split(':').map(Number);
        const slotStartMinutes = hours * 60 + minutes;

        // Оставляем только те слоты, которые начнутся, например, через 15 минут от текущего момента
        // или просто те, которые строго больше текущего времени
        return slotStartMinutes > currentWaitTime;
      });
    }

    return allSlots;
  }

  async findAll(hostname: string) {
    const company = await this.prisma.company.findUnique({
      where: { domain: hostname },
    });

    if (!company) {
      throw new BadRequestException('Company not found');
    }

    return this.prisma.schedule.findMany({
      where: { companyId: company.id },
      include: { specialist: true },
      orderBy: [{ specialistId: 'asc' }, { day_of_week: 'asc' }],
    });
  }

  async findOne(id: number, hostname: string) {
    const company = await this.prisma.company.findUnique({
      where: { domain: hostname },
    });

    if (!company) {
      throw new BadRequestException('Company not found');
    }

    const item = await this.prisma.schedule.findFirst({
      where: {
        id,
        companyId: company.id, // фильтр по компании
      },
      include: { specialist: true },
    });

    if (!item) throw new NotFoundException('Schedule not found');
    return item;
  }

  async update(id: number, dto: UpdateScheduleDto, companyId: number) {
    const existing = await this.prisma.schedule.findFirst({
      where: { id, companyId },
      include: { specialist: true },
    });

    if (!existing) throw new NotFoundException('Schedule not found');

    if (dto.day_of_week !== undefined) {
      const duplicate = await this.prisma.schedule.findFirst({
        where: {
          specialistId: existing.specialistId,
          day_of_week: dto.day_of_week,
          companyId,
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

  async remove(id: number, companyId: number) {
    const existing = await this.prisma.schedule.findFirst({
      where: { id, companyId }, // проверка принадлежности компании
    });

    if (!existing) throw new NotFoundException('Schedule not found');

    return this.prisma.schedule.delete({ where: { id } });
  }

  async findBySpecialist(specialistId: number, hostname: string) {
    const company = await this.prisma.company.findUnique({
      where: { domain: hostname },
    });

    if (!company) {
      throw new BadRequestException('Company not found');
    }

    return this.prisma.schedule.findMany({
      where: {
        specialistId,
        companyId: company.id, // фильтр по компании
      },
      orderBy: { day_of_week: 'asc' },
    });
  }

  generateSlots(
    start: string,
    end: string,
    duration: number,
    booked: BookingRange[],
  ): BookingRange[] {
    const slots: BookingRange[] = [];
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);

    let current = sh * 60 + sm;
    const endMin = eh * 60 + em;

    while (current + duration <= endMin) {
      const slotStart = current;
      const slotEnd = current + duration;

      const formattedStart = this.toTime(slotStart);
      const formattedEnd = this.toTime(slotEnd);

      const overlap = booked.some(
        (b) =>
          !(
            slotEnd <= this.toMinutes(b.start) ||
            slotStart >= this.toMinutes(b.end)
          ),
      );

      if (!overlap) {
        slots.push({ start: formattedStart, end: formattedEnd });
      }

      current += duration;
    }

    return slots;
  }

  toMinutes(t: string) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  toTime(m: number) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }
}
