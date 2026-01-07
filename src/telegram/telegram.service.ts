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

  public verifyTelegramInitData(
    initData: string,
    botToken: string,
  ): TelegramInitData {
    // 1. Превращаем строку в объект (URLSearchParams удобнее и безопаснее split)
    const searchParams = new URLSearchParams(initData);
    const params = Object.fromEntries(searchParams.entries());

    // 2. Извлекаем hash и проверяем его наличие
    const { hash, ...dataExceptHash } = params;

    if (!hash) {
      throw new UnauthorizedException('No hash in initData');
    }

    // 3. Формируем data_check_string
    // Сортируем ключи алфавитно и соединяем в формат key=value\n
    const dataCheckString = Object.keys(dataExceptHash)
      .sort()
      .map((key) => `${key}=${dataExceptHash[key]}`)
      .join('\n');

    // 4. Вычисляем проверочный HMAC
    // Сначала создаем secret_key на основе токена бота
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Затем вычисляем HMAC от dataCheckString
    const hmac = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // 5. Сравниваем
    if (hmac !== hash) {
      throw new UnauthorizedException('Telegram initData verification failed');
    }

    return params as TelegramInitData;
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
