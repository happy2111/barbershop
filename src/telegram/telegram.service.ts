import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import TelegramBot from 'node-telegram-bot-api';
import { randomBytes } from 'crypto';
import * as crypto from 'crypto';

export interface TelegramInitData {
  hash: string;
  [key: string]: string; // Для остальных полей (user, auth_date и т.д.)
}

@Injectable()
export class TelegramService {
  private bot: TelegramBot;

  constructor(private prisma: PrismaService) {
    this.bot = new TelegramBot(process.env.BOT_TOKEN!, { polling: false });
  }

  public verifyTelegramInitData(initData: string, botToken: string): any {
    // 1. Очищаем токен от лишних пробелов/кавычек
    const cleanToken = botToken.trim().replace(/['"]/g, '');

    const searchParams = new URLSearchParams(initData);
    const hash = searchParams.get('hash');

    if (!hash) {
      throw new UnauthorizedException('Hash is missing');
    }

    // 2. Собираем ключи, исключая подписи
    const keys = Array.from(searchParams.keys())
      .filter((key) => key !== 'hash' && key !== 'signature')
      .sort();

    // 3. Формируем строку проверки.
    // КРИТИЧЕСКИЙ МОМЕНТ: Telegram не экранирует слеши в JSON
    const dataCheckString = keys
      .map((key) => {
        let value = searchParams.get(key) || '';
        if (key === 'user') {
          // Убираем экранирование слешей, если оно появилось ( \/ -> / )
          value = value.replace(/\\\//g, '/');
        }
        return `${key}=${value}`;
      })
      .join('\n');

    // 4. Secret Key
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(cleanToken)
      .digest();

    // 5. HMAC
    const hmac = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (hmac !== hash) {
      // Для отладки выводим разницу
      console.log('--- DEBUG VALIDATION ---');
      console.log('Normalized String:\n', dataCheckString);
      console.log('HMAC match:', hmac === hash);
      throw new UnauthorizedException('Telegram initData verification failed');
    }

    const result = Object.fromEntries(searchParams.entries());
    if (result.user) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      result.user = JSON.parse(result.user as string);
    }

    return result;
  }

  // ---------------------------
  // Генерация одноразового токена для self-service
  // ---------------------------
  async generateLinkToken(companyId: number, expiresInMinutes = 10) {
    const token = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60_000);

    return this.prisma.telegramLinkToken.create({
      data: { companyId, token, expiresAt },
    });
  }

  // ---------------------------
  // Проверка токена и отметка как использованного
  // ---------------------------
  async validateToken(token: string) {
    const record = await this.prisma.telegramLinkToken.findUnique({
      where: { token },
      include: { company: true },
    });

    if (!record || record.used) throw new BadRequestException('Invalid token');
    if (record.expiresAt < new Date())
      throw new BadRequestException('Token expired');

    return record;
  }

  // ---------------------------
  // Привязка группы к компании через токен
  // ---------------------------
  async bindGroup(companyId: number, token: string, chatId: string) {
    const record = await this.validateToken(token);

    if (record.companyId !== companyId)
      throw new BadRequestException('Token does not belong to this company');

    // Обновляем компанию
    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        telegramChatId: chatId,
        telegramEnabled: true,
      },
    });

    // Отмечаем токен как использованный
    await this.prisma.telegramLinkToken.update({
      where: { id: record.id },
      data: { used: true },
    });

    return { success: true };
  }

  // ---------------------------
  // Отправка сообщения компании
  // ---------------------------
  async sendMessage(chatId: string, message: string) {
    try {
      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      return true;
    } catch (e) {
      console.error('Failed to send Telegram message:', e);
      return false;
    }
  }

  // ---------------------------
  // Отвязка группы
  // ---------------------------
  async unbindGroup(companyId: number) {
    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        telegramEnabled: false,
        telegramChatId: null,
      },
    });
  }

  async getStatus(companyId: number) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { telegramEnabled: true, telegramChatId: true },
    });
    return {
      enabled: company?.telegramEnabled ?? false,
      chatId: company?.telegramChatId ?? null,
    };
  }
}
