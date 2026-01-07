import { Controller  } from '@nestjs/common';
import { TelegramService } from './telegram.service';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
}

export interface VerifiedTelegramData {
  user?: TelegramUser;
  auth_date: string;
  hash: string;
  query_id?: string;
  [key: string]: any;
}

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  // @Post('verify')
  // verify(@Body() dto: TelegramInitDataDto) {
  //   const botToken = process.env.TELEGRAM_BOT_TOKEN;
  //
  //   if (!botToken) {
  //     throw new Error('BOT_TOKEN not configured');
  //   }
  //
  //   // Вызываем метод сервиса (который мы типизировали ранее)
  //   const rawData = this.telegramService.verifyTelegramInitData(
  //     dto.initData,
  //     botToken,
  //   );
  //
  //   // Парсим поле user, так как Telegram передает его строкой JSON
  //   let userData: TelegramUser | undefined;
  //   if (rawData.user) {
  //     // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  //     userData = JSON.parse(rawData.user as unknown as string);
  //   }
  //
  //   return {
  //     message: 'Valid Telegram user',
  //     userData,
  //     authDate: rawData.auth_date,
  //   };
  // }
}
