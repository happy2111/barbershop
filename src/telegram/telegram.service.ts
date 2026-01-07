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
    console.log('--- SERVICE LOG START ---');

    const botToken = process.env.BOT_TOKEN?.trim();
    if (!botToken) {
      console.error('CRITICAL: BOT_TOKEN is missing in process.env');
      throw new Error('BOT_TOKEN is not set in environment');
    }

    // Логируем часть токена для сверки (первые 5 и последние 5 символов)
    console.log(
      `Using BOT_TOKEN: ${botToken.substring(0, 5)}...${botToken.slice(-5)}`,
    );

    // 1. Secret Key
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // 2. Парсим параметры
    const params = new URLSearchParams(initDataRaw);
    const providedHash = params.get('hash');
    console.log('Provided Hash from Telegram:', providedHash);

    if (!providedHash) {
      console.error('FAIL: No hash found in initData');
      throw new UnauthorizedException('Telegram hash is missing');
    }

    // 3. Формируем dataCheckString
    const keys = Array.from(params.keys())
      .filter((k) => k !== 'hash' && k !== 'signature')
      .sort();
    console.log('Fields included in check:', keys.join(', '));

    const dataCheckString = keys
      .map((key) => `${key}=${params.get(key)}`)
      .join('\n');

    console.log('--- GENERATED DATA_CHECK_STRING ---');
    console.log(dataCheckString);
    console.log('--- END OF STRING ---');

    // 4. Считаем HMAC
    const hmac = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    console.log('Computed HMAC:', hmac);
    console.log(
      'Comparison Result:',
      hmac === providedHash ? 'MATCH ✅' : 'MISMATCH ❌',
    );

    if (hmac !== providedHash) {
      // Последний шанс: пробуем без декодирования (иногда помогает)
      console.log('Attempting alternative verification (raw parts)...');
      // ... (код альтернативы если нужно)
      throw new UnauthorizedException('Telegram data hash verification failed');
    }

    const result = Object.fromEntries(params.entries());
    if (result.user) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      result.user = JSON.parse(result.user);
      // @ts-ignore
      console.log('Successfully parsed Telegram User ID:', result.user.id);
    }

    console.log('--- SERVICE LOG END ---');
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
