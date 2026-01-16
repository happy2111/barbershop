// src/dashboard/dashboard.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, Role } from '@prisma/client';
import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns';

export interface SpecialistLoad {
  id: number;
  name: string;
  load: number;
  status: string;
  bookedHours: number;
  totalHours: number;
}

export interface SpecialistBest {
  name: string;
  value: number;
}

export interface PopularService {
  name: string;
  value: number;
}

export interface LostMoneyResult {
  count: number;
  lost: number;
}

export interface RepeatClientsResult {
  newClients: number;
  repeatClients: number;
  repeatPercent: number;
  avgVisits: string;
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private getDateRange(period: 'today' | 'week' | 'month' = 'month'): {
    start: Date;
    end: Date;
  } {
    const now = new Date();
    switch (period) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return {
          start: startOfWeek(now, { weekStartsOn: 1 }),
          end: endOfWeek(now, { weekStartsOn: 1 }),
        };
      case 'month':
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }

  async getRevenue(
    companyId: number,
    period: 'today' | 'week' | 'month' = 'month',
  ): Promise<{ period: string; revenue: number }> {
    const { start, end } = this.getDateRange(period);
    const bookings = await this.prisma.booking.findMany({
      where: {
        companyId,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        date: { gte: start, lte: end },
      },
      include: {
        services: {
          include: { service: { select: { price: true } } },
        },
      },
    });

    const revenue = bookings.reduce((sum, b) => {
      const bookingSum = b.services.reduce(
        (s, bs) => s + (bs.service?.price || 0),
        0,
      );
      return sum + bookingSum;
    }, 0);

    return { period, revenue };
  }

  async getRevenueGraph(
    companyId: number,
    days = 30,
  ): Promise<Array<{ date: string; value: number }>> {
    const now = new Date();
    const start = subDays(now, days - 1);

    const bookings = await this.prisma.booking.findMany({
      where: {
        companyId,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        date: { gte: start, lte: now },
      },
      include: {
        services: {
          include: { service: { select: { price: true } } },
        },
      },
    });

    const data: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = format(subDays(now, i), 'yyyy-MM-dd');
      data[d] = 0;
    }

    bookings.forEach((b) => {
      const d = format(b.date, 'yyyy-MM-dd');

      // сумма по всем услугам брони
      const bookingSum = b.services.reduce(
        (sum, bs) => sum + (bs.service?.price || 0),
        0,
      );

      data[d] += bookingSum;
    });

    return Object.entries(data)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }


  async getBookingsCount(
    companyId: number,
    period: 'today' | 'tomorrow' | 'month' = 'month',
  ): Promise<{ period: string; count: number }> {
    const now = new Date();
    let start: Date, end: Date;

    if (period === 'today') {
      start = startOfDay(now);
      end = endOfDay(now);
    } else if (period === 'tomorrow') {
      const tomorrow = addDays(now, 1);
      start = startOfDay(tomorrow);
      end = endOfDay(tomorrow);
    } else {
      start = startOfMonth(now);
      end = endOfMonth(now);
    }

    const count = await this.prisma.booking.count({
      where: {
        companyId,
        date: { gte: start, lte: end },
        status: { not: BookingStatus.CANCELLED },
        isSystem: false,
      },
    });

    return { period, count };
  }

  async getBookingsGraph(
    companyId: number,
    days = 30,
  ): Promise<Array<{ date: string; value: number }>> {
    const now = new Date();
    const start = subDays(now, days - 1);

    const bookings = await this.prisma.booking.findMany({
      where: {
        companyId,
        date: { gte: start, lte: now },
        status: { not: BookingStatus.CANCELLED },
        isSystem: false,
      },
      select: { date: true },
    });

    const data: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = format(subDays(now, i), 'yyyy-MM-dd');
      data[d] = 0;
    }

    bookings.forEach((b) => {
      const d = format(b.date, 'yyyy-MM-dd');
      data[d]++;
    });

    return Object.entries(data)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getSpecialistsLoad(
    companyId: number,
    period: 'week' | 'month' = 'month',
  ): Promise<SpecialistLoad[]> {
    const { start, end } = this.getDateRange(period);
    const specialists = await this.prisma.specialist.findMany({
      where: { companyId, role: Role.SPECIALIST },
      include: { schedules: true },
    });

    const loads: SpecialistLoad[] = [];
    const daysInPeriod =
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;

    for (const spec of specialists) {
      let totalAvailableMinutes = 0;

      for (const sch of spec.schedules) {
        const [sh, sm] = sch.start_time.split(':').map(Number);
        const [eh, em] = sch.end_time.split(':').map(Number);
        const minutesPerDay = eh * 60 + em - (sh * 60 + sm);

        const occurrences =
          Math.floor((daysInPeriod - 1) / 7) +
          ((daysInPeriod - 1) % 7 >= sch.day_of_week - 1 ? 1 : 0);

        totalAvailableMinutes += minutesPerDay * occurrences;
        const dayIndex = sch.day_of_week === 0 ? 6 : sch.day_of_week - 1;

      }


      const bookings = await this.prisma.booking.findMany({
        where: {
          companyId,
          specialistId: spec.id,
          date: { gte: start, lte: end },
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        },
        include: {
          services: {
            include: {
              service: {
                select: { duration_min: true },
              },
            },
          },
        },
      });


      const totalBookedMinutes = bookings.reduce(
        (sum, b) =>
          sum +
          b.services.reduce((s, bs) => s + (bs.service?.duration_min || 0), 0),
        0,
      );


      const loadPercent =
        totalAvailableMinutes > 0
          ? (totalBookedMinutes / totalAvailableMinutes) * 100
          : 0;

      // Вместо эмодзи возвращаем системный статус и доп. данные
      loads.push({
        id: spec.id,
        name: spec.name,
        load: Math.round(loadPercent),
        bookedHours: Math.round(totalBookedMinutes / 60),
        totalHours: Math.round(totalAvailableMinutes / 60),
        status:
          loadPercent > 80 ? 'high' : loadPercent < 40 ? 'low' : 'optimal',
      });
    }

    return loads.sort((a, b) => b.load - a.load);
  }

  async getPopularServices(
    companyId: number,
    top = 5,
    type: 'count' | 'revenue' = 'count',
    period: 'month' = 'month',
  ): Promise<PopularService[]> {
    const { start, end } = this.getDateRange(period);

    const bookings = await this.prisma.booking.findMany({
      where: {
        companyId,
        date: { gte: start, lte: end },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
      },
      include: {
        services: {
          include: {
            service: { select: { id: true, name: true, price: true } },
          },
        },
      },
    });

    const serviceMap = new Map<number, { name: string; count: number; revenue: number }>();

    bookings.forEach((booking) => {
      booking.services.forEach((bs) => {
        if (bs.service) {
          const entry = serviceMap.get(bs.service.id) || {
            name: bs.service.name,
            count: 0,
            revenue: 0,
          };
          entry.count++;
          entry.revenue += bs.service.price;
          serviceMap.set(bs.service.id, entry);
        }
      });
    });

    const sorted = Array.from(serviceMap.values())
      .sort((a, b) =>
        type === 'count' ? b.count - a.count : b.revenue - a.revenue,
      )
      .slice(0, top);

    return sorted.map((s) => ({
      name: s.name,
      value: type === 'count' ? s.count : s.revenue,
    }));
  }


  async getLostMoney(
    companyId: number,
    period: 'month' = 'month',
  ): Promise<LostMoneyResult> {
    const { start, end } = this.getDateRange(period);

    const bookings = await this.prisma.booking.findMany({
      where: {
        companyId,
        status: BookingStatus.CANCELLED,
        date: { gte: start, lte: end },
      },
      include: {
        services: {
          include: {
            service: { select: { price: true } },
          },
        },
      },
    });

    const lost = bookings.reduce((sum, booking) => {
      const bookingTotal = booking.services.reduce(
        (serviceSum, bs) => serviceSum + (bs.service?.price || 0),
        0,
      );
      return sum + bookingTotal;
    }, 0);

    const count = bookings.length;

    return { count, lost };
  }


  async getRepeatClients(
    companyId: number,
    period: 'month' = 'month',
  ): Promise<RepeatClientsResult> {
    const { start, end } = this.getDateRange(period);
    const bookings = await this.prisma.booking.findMany({
      where: {
        companyId,
        date: { gte: start, lte: end },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        clientId: { not: null },
      },
      select: { clientId: true },
    });

    const clientCounts = new Map<number, number>();
    bookings.forEach((b) => {
      if (b.clientId) {
        clientCounts.set(b.clientId, (clientCounts.get(b.clientId) || 0) + 1);
      }
    });

    const totalClients = clientCounts.size;
    const repeatClients = Array.from(clientCounts.values()).filter(
      (c) => c > 1,
    ).length;
    const newClients = totalClients - repeatClients;
    const repeatPercent =
      totalClients > 0 ? Math.round((repeatClients / totalClients) * 100) : 0;
    const avgVisits =
      totalClients > 0 ? (bookings.length / totalClients).toFixed(2) : '0.00';

    return { newClients, repeatClients, repeatPercent, avgVisits };
  }

  async getBestSpecialist(
    companyId: number,
    type: 'revenue' | 'clients' = 'revenue',
    period: 'month' = 'month',
  ): Promise<SpecialistBest> {
    const { start, end } = this.getDateRange(period);
    const specialists = await this.prisma.specialist.findMany({
      where: { companyId },
      select: { id: true, name: true },
    });

    const bests: SpecialistBest[] = [];

    for (const spec of specialists) {
      const bookings = await this.prisma.booking.findMany({
        where: {
          companyId,
          specialistId: spec.id,
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
          date: { gte: start, lte: end },
        },
        include: {
          services: {
            include: { service: { select: { price: true } } },
          },
        },
      });

      // Считаем доход, суммируя цены всех услуг каждой брони
      const revenue = bookings.reduce(
        (sum, booking) =>
          sum +
          booking.services.reduce(
            (serviceSum, bs) => serviceSum + (bs.service?.price || 0),
            0,
          ),
        0,
      );

      // Количество уникальных клиентов
      const uniqueClients = new Set(
        bookings.map((b) => b.clientId).filter(Boolean),
      ).size;

      const value = type === 'revenue' ? revenue : uniqueClients;

      bests.push({ name: spec.name, value });
    }

    bests.sort((a, b) => b.value - a.value);
    return bests[0] || { name: 'Нет данных', value: 0 };
  }


  async getAverageCheck(
    companyId: number,
    period: 'month' = 'month',
  ): Promise<number> {
    const { start, end } = this.getDateRange(period);

    const bookings = await this.prisma.booking.findMany({
      where: {
        companyId,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
      },
      include: {
        services: {
          include: { service: { select: { price: true } } },
        },
      },
    });

    if (bookings.length === 0) return 0;
    const totalRevenue = bookings.reduce(
      (sum, b) =>
        sum +
        b.services.reduce((s, bs) => s + (bs.service?.price || 0), 0),
      0,
    );
    return Math.round(totalRevenue / bookings.length);
  }


  async getPeakHours(
    companyId: number,
    period: 'month' = 'month',
  ): Promise<{ peaks: string; lows: string }> {
    const { start, end } = this.getDateRange(period);
    const bookings = await this.prisma.booking.findMany({
      where: {
        companyId,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        date: { gte: start, lte: end },
      },
      select: { start_time: true },
    });

    const hourCounts: any[] = new Array(24).fill(0);
    bookings.forEach((b) => {
      const hour = parseInt(b.start_time.split(':')[0], 10);
      hourCounts[hour]++;
    });

    let maxCount: number = 0;
    let minCount = Infinity;
    hourCounts.forEach((c: number) => {
      if (c > maxCount) maxCount = c;
      if (c < minCount && c > 0) minCount = c;
    });

    const peaks: string[] = [];
    const lows: string[] = [];

    hourCounts.forEach((count, hour) => {
      if (count === maxCount) {
        peaks.push(
          `${hour.toString().padStart(2, '0')}:00–${(hour + 1).toString().padStart(2, '0')}:00`,
        );
      }
      if (count === minCount && count > 0) {
        lows.push(
          `${hour.toString().padStart(2, '0')}:00–${(hour + 1).toString().padStart(2, '0')}:00`,
        );
      }
    });

    return {
      peaks: peaks.join(', ') || '—',
      lows: lows.join(', ') || '—',
    };
  }
}
