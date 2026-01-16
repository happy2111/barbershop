import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // твой готовый сервис
import { UpdateSpecialistDto } from './dto/update-specialist.dto';
import { CreateScheduleDto } from './dto/schedule.dto';
import * as bcrypt from 'bcryptjs';

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
            services: {
              include: {
                service: {
                  select: {name: true, price: true}
                }
              }
            },
          },
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!specialist) {
      throw new NotFoundException('Специалист не найден');
    }

    const services = specialist.services.map((ss) => ss.service);

    return {
      ...specialist,
      services,
      schedules: specialist.schedules,
      bookings: specialist.bookings,
    };
  }

  async updateProfile(
    specialistId: number,
    companyId: number,
    dto: UpdateSpecialistDto,
  ) {
    // Проверяем, что специалист принадлежит компании
    const specialist = await this.prisma.specialist.findFirst({
      where: { id: specialistId, companyId },
    });

    if (!specialist) {
      throw new NotFoundException('Специалист не найден в вашей компании');
    }

    // Обновляем
    const updated = await this.prisma.specialist.update({
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

    return updated;
  }

  async getSchedule(specialistId: number, companyId: number) {
    const specialist = await this.prisma.specialist.findFirst({
      where: { id: specialistId, companyId },
    });

    if (!specialist) {
      throw new NotFoundException('Специалист не найден в вашей компании');
    }

    return this.prisma.schedule.findMany({
      where: { specialistId },
      orderBy: { day_of_week: 'asc' },
    });
  }

  async upsertSchedule(
    specialistId: number,
    companyId: number,
    dto: CreateScheduleDto,
  ) {
    // Проверяем, что специалист принадлежит компании
    const specialist = await this.prisma.specialist.findFirst({
      where: { id: specialistId, companyId },
    });

    if (!specialist) {
      throw new NotFoundException('Специалист не найден в вашей компании');
    }

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
          companyId,
        },
      });
    }
  }

  async deleteSchedule(
    specialistId: number,
    companyId: number,
    day_of_week: number,
  ) {
    // Проверяем, что специалист принадлежит компании
    const specialist = await this.prisma.specialist.findFirst({
      where: { id: specialistId, companyId },
    });

    if (!specialist) {
      throw new NotFoundException('Специалист не найден в вашей компании');
    }

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
  async getUpcomingBookings(specialistId: number, companyId: number) {
    // Проверяем, что специалист принадлежит компании
    const specialist = await this.prisma.specialist.findFirst({
      where: { id: specialistId, companyId },
    });

    if (!specialist) {
      throw new NotFoundException('Специалист не найден в вашей компании');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.booking.findMany({
      where: {
        specialistId,
        isSystem: false,
        date: { gte: today },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      include: {
        client: { select: { name: true, phone: true } },
        services: {
          include: {
            service: {
              select: {name: true, price: true, duration_min: true}
            }
          }
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  async getPastBookings(specialistId: number, companyId: number) {
    // Проверяем, что специалист принадлежит компании
    const specialist = await this.prisma.specialist.findFirst({
      where: { id: specialistId, companyId },
    });

    if (!specialist) {
      throw new NotFoundException('Специалист не найден в вашей компании');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.booking.findMany({
      where: {
        isSystem: false,
        specialistId,
        date: { lt: today },
      },
      include: {
        client: { select: { name: true, phone: true } },
        services: {
          include: {
            service: {
              select: {name: true, price: true}
            }
          }
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async changePassword(
    userId: number,
    companyId: number,
    oldPassword: string,
    newPassword: string | undefined,
  ) {
    console.log(
      oldPassword
    )
    const user = await this.prisma.specialist.findUnique({
      where: { id: userId, companyId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }


    const isValid: boolean = await bcrypt.compare(oldPassword, user.password);

    if (!isValid) {
      throw new NotFoundException('Invalid password');
    }

    if (newPassword) {
      const hashed = await bcrypt.hash(newPassword, 10);

      return this.prisma.specialist.update({
        where: { id: userId },
        data: { password: hashed },
      });
    }

    return { message: 'Password valid' };
  }
}
