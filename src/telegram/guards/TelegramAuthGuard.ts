import { UnauthorizedException } from '@nestjs/common';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TelegramService } from '../telegram.service';

interface CompanyTelegram {
  telegramBotToken: string | null;
}

@Injectable()
export class TelegramAuthGuard implements CanActivate {
  constructor(
    private telegramService: TelegramService,
    private prisma: PrismaService, // Добавляем призму сюда
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: any = context.switchToHttp().getRequest();
    const initData: any = request.headers['x-telegram-init-data'];
    const hostname: string = request.query.hostname; // Получаем из query

    console.log('hostname: ', hostname);

    if (!initData) return true;

    if (!hostname) {
      throw new UnauthorizedException(
        'Hostname query parameter is required for Telegram validation',
      );
    }

    const company: CompanyTelegram | null =
      await this.prisma.company.findUnique({
        where: { domain: hostname },
        select: { telegramBotToken: true },
      });

    console.log('company: ', company);

    if (!company?.telegramBotToken) {
      throw new UnauthorizedException('Company telegram bot is not configured');
    }

    // 2. Расшифровываем токен (если шифровали) или берем как есть
    const botToken: string = company.telegramBotToken;

    try {
      // 3. Передаем токен в метод валидации
      const validatedData: any = this.telegramService.verifyTelegramInitData(
        initData,
        botToken,
      );
      request.telegramUser = validatedData;
      return true;
    } catch (e) {
      throw new UnauthorizedException('Invalid Telegram data for this company');
    }
  }
}
