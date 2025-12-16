import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // твой готовый сервис
import { UpdateSpecialistDto } from './dto/update-specialist.dto';
import { CreateScheduleDto} from './dto/schedule.dto';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  // Получить профиль специалиста + его услуги и расписание
  async getProfile(specialistId: number) {
    const specialist = await this.prisma.specialist.findUnique({
      where: { id: specialistId },
      include: {
        services: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                price: true,
                duration_min: true,
                photo: true,
              },
            },
          },
        },
        schedules: {
          orderBy: { day_of_week: 'asc' },
        },
        bookings: {
          include: {
            client: {
              select: { name: true, phone: true },
            },
            service: {
              select: { name: true, price: true },
            },
          },
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!specialist) {
      throw new NotFoundException('Специалист не найден');
    }

    // Форматируем услуги
    const services = specialist.services.map((ss) => ss.service);

    return {
      ...specialist,
      services,
      schedules: specialist.schedules,
      bookings: specialist.bookings,
    };
  }

  // Обновить информацию о специалисте
  async updateProfile(specialistId: number, dto: UpdateSpecialistDto) {
    return this.prisma.specialist.update({
      where: { id: specialistId },
      data: dto,
      select: {
        id: true,
        name: true,
        phone: true,
        photo: true,
        description: true,
        skills: true,
      },
    });
  }

  async getSchedule(specialistId: number) {
    return this.prisma.schedule.findMany({
      where: { specialistId },
      orderBy: { day_of_week: 'asc' },
    });
  }

  async upsertSchedule(specialistId: number, dto: CreateScheduleDto) {
    const existing = await this.prisma.schedule.findUnique({
      where: {
        specialistId_day_of_week: {
          specialistId,
          day_of_week: dto.day_of_week,
        },
      },
    });

    if (existing) {
      // Обновляем
      return this.prisma.schedule.update({
        where: { id: existing.id },
        data: dto,
      });
    } else {
      // Создаём новое
      return this.prisma.schedule.create({
        data: {
          ...dto,
          specialistId,
        },
      });
    }
  }

  // Удалить расписание на день недели
  async deleteSchedule(specialistId: number, day_of_week: number) {
    const schedule = await this.prisma.schedule.findUnique({
      where: {
        specialistId_day_of_week: {
          specialistId,
          day_of_week,
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException('Расписание на этот день не найдено');
    }

    await this.prisma.schedule.delete({
      where: { id: schedule.id },
    });

    return { message: 'Расписание удалено' };
  }

  // Получить предстоящие брони
  async getUpcomingBookings(specialistId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.booking.findMany({
      where: {
        specialistId,
        date: { gte: today },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      include: {
        client: { select: { name: true, phone: true } },
        service: { select: { name: true, price: true, duration_min: true } },
      },
      orderBy: { date: 'asc' },
    });
  }

  // Получить прошедшие брони (история)
  async getPastBookings(specialistId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.booking.findMany({
      where: {
        specialistId,
        date: { lt: today },
      },
      include: {
        client: { select: { name: true, phone: true } },
        service: { select: { name: true, price: true } },
      },
      orderBy: { date: 'desc' },
    });
  }
}