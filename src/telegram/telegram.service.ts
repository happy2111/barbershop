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

  public verifyTelegramInitData(initData: string): any {
    const token = process.env.BOT_TOKEN?.trim();
    if (!token) throw new UnauthorizedException('Bot token not found');

    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');

    if (!hash) throw new UnauthorizedException('Hash is missing');

    // 1. Создаем массив ключей, исключая hash и signature
    const keys = Array.from(urlParams.keys())
      .filter((key) => key !== 'hash' && key !== 'signature')
      .sort();

    // 2. Формируем строку.
    // ВАЖНО: Мы берем значение через urlParams.get(),
    // это автоматически декодирует %2F в / и т.д.
    const dataCheckString = keys
      .map((key) => {
        const value = urlParams.get(key);
        return `${key}=${value}`;
      })
      .join('\n');

    // 3. Вычисляем Secret Key
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(token)
      .digest();

    // 4. Вычисляем HMAC
    const hmac = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Логируем для финальной проверки
    if (hmac !== hash) {
      console.log('--- FINAL ATTEMPT ---');
      console.log('Data Check String:\n', dataCheckString);
      console.log('Computed HMAC:', hmac);
      console.log('Expected Hash:', hash);

      // Если не совпало, пробуем один хак со слешами (иногда помогает для JSON)
      const altDataCheckString = dataCheckString.replace(/\//g, '\\/');
      const altHmac = crypto
        .createHmac('sha256', secretKey)
        .update(altDataCheckString)
        .digest('hex');

      if (altHmac === hash) {
        console.log('Match found with escaped slashes!');
        return this.parseResult(urlParams);
      }

      throw new UnauthorizedException('Telegram initData verification failed');
    }

    return this.parseResult(urlParams);
  }

  private parseResult(urlParams: URLSearchParams) {
    const result = Object.fromEntries(urlParams.entries());
    if (result.user) {
      result.user = JSON.parse(result.user);
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
