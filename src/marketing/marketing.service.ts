import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { BookingStatus } from '@prisma/client';

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

    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

    const startOfDay = new Date(new Date(twentyDaysAgo).setHours(0, 0, 0, 0));
    const endOfDay = new Date(
      new Date(twentyDaysAgo).setHours(23, 59, 59, 999),
    );

    // Находим бронирования
    const bookings = await this.prisma.booking.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: BookingStatus.COMPLETED,
        client: {
          telegramId: {
            not: null,
          },
        },

        company: {
          telegramEnabled: true,
          telegramBotToken: { not: null },
        },
      },
      include: {
        client: true,
        company: true,
      },
    });

    this.logger.log(`Found ${bookings.length} clients for marketing campaign.`);

    for (const booking of bookings) {
      // Проверка на случай, если TypeScript все еще сомневается в наличии связей
      if (
        !booking.client ||
        !booking.company ||
        !booking.company.telegramBotToken
      ) {
        continue;
      }

      try {
        const clientName =
          booking.client.name || booking.client.telegramFirstName || 'друг';

        const message = `
👋 Привет, ${clientName}! 

Прошло уже 20 дней с вашего последнего визита в *${booking.company.name}*. 
Самое время обновить стрижку или процедуру! ✨

Записаться онлайн можно тут:
🔗 ${booking.company.webAppUrl && booking.company.webAppUrl.length > 0 ? booking.company.webAppUrl : `https://${booking.company.domain}`}

Ждем вас снова!
`;

        if (booking.client.telegramId) {
          await this.telegramService.sendMessage(
            booking.client.telegramId.toString(),
            message,
            booking.company.telegramBotToken,
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Failed to send newsletter to client ${booking.client.id}: ${errorMessage}`,
        );
      }
    }
  }
}
