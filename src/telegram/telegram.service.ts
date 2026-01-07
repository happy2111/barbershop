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
    // 1. Очистка входной строки от лишних пробелов по краям
    const rawString = initDataRaw.trim();
    const botToken = process.env.BOT_TOKEN?.trim();
    console.log(botToken);
    console.log(initDataRaw);
    if (!botToken) throw new Error('BOT_TOKEN missing');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const parts = rawString.split('&');
    const hashPart = parts.find((p) => p.startsWith('hash='));
    const hash = hashPart?.split('=')[1];

    if (!hash) throw new UnauthorizedException('Hash missing');

    // 2. Функция для сборки проверочной строки
    const buildCheckString = (shouldUnescapeUser: boolean) => {
      const pairs = parts
        .filter((p) => !p.startsWith('hash=') && !p.startsWith('signature='))
        .map((p) => {
          const pos = p.indexOf('=');
          const key = p.substring(0, pos);
          let value = decodeURIComponent(p.substring(pos + 1));

          // Если флаг активен, превращаем \/ в /
          if (key === 'user' && shouldUnescapeUser) {
            value = value.replace(/\\\//g, '/');
          }
          return `${key}=${value}`;
        });
      return pairs.sort().join('\n');
    };

    // Вариант А: Как есть (с \/)
    const stringA = buildCheckString(false);
    const hmacA = crypto
      .createHmac('sha256', secretKey)
      .update(stringA)
      .digest('hex');

    // Вариант Б: Нормализованный JSON (с /)
    const stringB = buildCheckString(true);
    const hmacB = crypto
      .createHmac('sha256', secretKey)
      .update(stringB)
      .digest('hex');

    console.log('--- FINAL VALIDATION ATTEMPT ---');
    console.log('Expected Hash:', hash);
    console.log('HMAC (Option A - escaped):', hmacA);
    console.log('HMAC (Option B - unescaped):', hmacB);

    let finalResult: string | null = null;
    if (hmacA === hash) finalResult = stringA;
    else if (hmacB === hash) finalResult = stringB;

    if (!finalResult) {
      throw new UnauthorizedException('Hash mismatch after all attempts');
    }

    console.log('SUCCESS! Match found.');

    const params = Object.fromEntries(new URLSearchParams(rawString).entries());
    if (params.user) params.user = JSON.parse(params.user);
    return params;
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
