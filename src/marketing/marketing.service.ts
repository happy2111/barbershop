import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { BookingStatus } from '@prisma/client';
import {translations} from "../messages";

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(
    private prisma: PrismaService,
    private telegramService: TelegramService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async handleRetentionNewsletter() {
    this.logger.log('Starting daily marketing newsletter...');

    const today = new Date();
    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(today.getDate() - 20);

    const startOfDay = new Date(new Date(twentyDaysAgo).setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date(twentyDaysAgo).setHours(23, 59, 59, 999));

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
          data: { lastMarketingSentAt: new Date() }
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
}
