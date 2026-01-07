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

  public verifyTelegramInitData(initDataRaw: string): any {
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      throw new Error('BOT_TOKEN is not set in environment');
    }

    // 1. Создаем Secret Key
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // 2. Парсим параметры
    const params = new URLSearchParams(initDataRaw);
    const providedHash = params.get('hash');

    if (!providedHash) {
      throw new UnauthorizedException('Telegram hash is missing');
    }

    // 3. Собираем ключи и сортируем их (как в вашем рабочем коде)
    const pairs: string[] = [];
    const keys: string[] = [];

    for (const [key] of params.entries()) {
      if (key === 'hash') continue;
      keys.push(key);
    }

    keys.sort();

    for (const key of keys) {
      pairs.push(`${key}=${params.get(key)}`);
    }

    const dataCheckString = pairs.join('\n');

    // 4. Вычисляем HMAC
    const hmac = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // 5. Безопасное сравнение (Timing Safe)
    const hmacBuffer = Buffer.from(hmac, 'hex');
    const hashBuffer = Buffer.from(providedHash, 'hex');

    const verified =
      hmacBuffer.length === hashBuffer.length &&
      crypto.timingSafeEqual(hmacBuffer, hashBuffer);

    if (!verified) {
      // Логируем для отладки, если не совпало
      console.log('--- VALIDATION FAILED ---');
      console.log('Data Check String:\n', dataCheckString);
      console.log('Computed HMAC:', hmac);
      console.log('Provided Hash:', providedHash);
      throw new UnauthorizedException('Telegram data hash verification failed');
    }

    // 6. Извлекаем данные пользователя
    const userStr = params.get('user');
    const result = Object.fromEntries(params.entries());

    if (userStr) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        result.user = JSON.parse(userStr);
      } catch (e) {
        console.error('Failed to parse user from initData:', e);
      }
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
