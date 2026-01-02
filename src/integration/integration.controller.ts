import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../auth/types/AuthRequest';
import { TelegramService } from '../telegram/telegram.service';

@Controller('integration')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class IntegrationController {
  constructor(private readonly telegramService: TelegramService) {}

  // -------------------------------
  // Генерация одноразового токена для привязки Telegram
  // -------------------------------
  @Post('telegram/token')
  async generateTelegramToken(@User() user: { companyId: number }) {
    const token = await this.telegramService.generateLinkToken(user.companyId);
    return { token: token.token, expiresAt: token.expiresAt };
  }

  // -------------------------------
  // Привязка Telegram группы (от frontend)
  // -------------------------------
  @Post('telegram/bind')
  async bindTelegram(
    @User() user: { companyId: number },
    @Body() body: { token: string; chatId: string },
  ) {
    await this.telegramService.bindGroup(
      user.companyId,
      body.token,
      body.chatId,
    );
    return { success: true };
  }

  // -------------------------------
  // Проверка статуса интеграции
  // -------------------------------
  @Get('telegram/status')
  async telegramStatus(@User() user: { companyId: number }) {
    return this.telegramService.getStatus(user.companyId);
  }

  // -------------------------------
  // Отвязка Telegram
  // -------------------------------
  @Post('telegram/unbind')
  async unbindTelegram(@User() user: { companyId: number }) {
    await this.telegramService.unbindGroup(user.companyId);
    return { success: true };
  }
}
