import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { BookingStatus } from '@prisma/client';
import {translations} from "../messages";
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);
  private readonly TZ = "Asia/Tashkent";

  constructor(
    private prisma: PrismaService,
    private telegramService: TelegramService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async handleRetentionNewsletter() {

    this.logger.log('Starting daily marketing newsletter...');

    const base = dayjs().tz(this.TZ).subtract(20, 'day');

    const startOfDay = base.startOf('day').toDate();
    const endOfDay = base.endOf('day').toDate();


    // Ищем бронирования
    const bookings = await this.prisma.booking.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: BookingStatus.COMPLETED,
        // Проверяем, включен ли маркетинг у компании
        company: {
          marketingEnabled: true,
          telegramEnabled: true,
          telegramBotToken: { not: null },
        },
        client: {
          telegramId: { not: null },
          OR: [
            { lastMarketingSentAt: null }, // Либо никогда не отправляли
            { lastMarketingSentAt: { lt: startOfDay } } // Либо отправляли очень давно
          ]
        },
      },
      // Группируем по клиенту, чтобы не брать одного и того же клиента дважды за один запуск
      distinct: ['clientId'],
      include: {
        client: true,
        company: true,
      },
    });

    this.logger.log(`Found ${bookings.length} potential clients for marketing.`);

    for (const booking of bookings) {
      if (!booking.client || !booking.client.telegramId || !booking.company?.telegramBotToken) continue;
      try {
        // 1. Дополнительная проверка: не было ли у клиента завершенных визитов ПОСЛЕ того, что мы нашли?
        // Это нужно, чтобы не звать клиента, который уже был у нас вчера
        const moreRecentBooking = await this.prisma.booking.findFirst({
          where: {
            clientId: booking.clientId,
            date: { gt: endOfDay },
            status: BookingStatus.COMPLETED,
          }
        });

        this.logger.log(`Processing client ${booking.client.id}...`);

        if (moreRecentBooking) {
          this.logger.log(`Skipping client ${booking.client.id}: has more recent booking.`);
          continue;
        }

        // 2. Формируем сообщение
        const clientName = booking.client.name || booking.client.telegramFirstName || 'друг';
        const clientLocal = booking.client.local || "uz";
        const t = translations[clientLocal];

        const message = `
${t.marketing.greeting.replace('{clientName}', clientName)}
${t.marketing.message.replace('{booking.company.name}', booking.company.name)}
${t.marketing.message2}

${t.marketing.info}
🔗 ${booking.company.webAppUrl ? booking.company.webAppUrl : `https://${booking.company.domain}`}

${t.marketing.waitingYou}
`;

        // 3. Отправляем в Telegram
        await this.telegramService.sendMessage(
          booking.client.telegramId.toString(),
          message,
          booking.company.telegramBotToken,
        );

        // 4. ОБЯЗАТЕЛЬНО обновляем дату отправки
        await this.prisma.client.update({
          where: { id: booking.client.id },
          data: { lastMarketingSentAt: dayjs().tz(this.TZ).toDate() }
        });

        // Небольшая задержка, чтобы не спамить в API Telegram
        await new Promise((resolve) => setTimeout(resolve, 100));

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Failed to send newsletter to client ${booking.client?.id}: ${errorMessage}`,
        );
      }
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleBookingReminders() {
    this.logger.log('Starting booking reminders...');
    const now = dayjs().tz(this.TZ);

    const startOfDay = now.startOf('day').toDate();
    const endOfDay = now.endOf('day').toDate();

    // 1. Берем все подтвержденные записи на сегодня, которые еще не уведомлены
    const bookings = await this.prisma.booking.findMany({
      where: {
        // date: {
        //   gte: startOfDay,
        //   lte: endOfDay,
        // },
        status: BookingStatus.CONFIRMED,
        reminderSent: false,
        client: {
          telegramId: { not: null },
        },
      },
      include: {
        client: true,
        company: true,
        specialist: true,
      },
    });

    for (const booking of bookings) {
      // 2. Склеиваем дату из базы и строку времени "10:40"
      // booking.date (Date) + booking.start_time ("10:40")
      const [hours, minutes] = booking.start_time.split(':').map(Number);
      const bookingDateTime = dayjs(booking.date)
        .tz(this.TZ)
        .hour(hours)
        .minute(minutes);

      // 3. Считаем разницу в минутах между "сейчас" и "временем записи"
      const diffInMinutes = bookingDateTime.diff(now, 'minute');

      // 4. Если до записи осталось от 30 до 60 минут — отправляем
      if (diffInMinutes >= 5 && diffInMinutes <= 60) {
        await this.sendReminder(booking);
      }

      this.logger.log(`Booking ${booking.id}: diff=${diffInMinutes}, status=${booking.status}, reminderSent=${booking.reminderSent}`);
    }
  }

  private async sendReminder(booking: any) {
    try {
      const clientLocal = booking.client.local || 'uz';
      const t = translations[clientLocal];

      // Подготовка данных для сообщения
      const clientName = booking.client.name || booking.client.telegramFirstName || '';
      const companyName = booking.company.name;
      const time = booking.start_time;
      const specialistName = booking.specialist.name;

      // Формирование текста сообщения
      const message = `
${t.reminder.title}

${t.reminder.body
        .replace('{name}', clientName)
        .replace('{time}', time)
        .replace('{companyName}', companyName)}

${t.reminder.specialist.replace('{specialistName}', specialistName)}

${t.reminder.footer}
`.trim();

      // Отправка в Telegram
      await this.telegramService.sendMessage(
        booking.client.telegramId.toString(),
        message,
        booking.company.telegramBotToken,
      );

      // Помечаем в базе как отправленное
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { reminderSent: true },
      });

      this.logger.log(`Reminder sent to client ${booking.client.id} for booking ${booking.id}`);
    } catch (e: any) {
      this.logger.error(`Error sending reminder for booking ${booking.id}: ${e.message}`);
    }
  }

}
