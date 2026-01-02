import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import TelegramBot from 'node-telegram-bot-api';
import { randomBytes } from 'crypto';

@Injectable()
export class TelegramService {
  private bot: TelegramBot;

  constructor(private prisma: PrismaService) {
    this.bot = new TelegramBot(process.env.BOT_TOKEN!, { polling: false });
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
