// telegram.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TelegramService } from '../telegram.service';

@Injectable()
export class TelegramAuthGuard implements CanActivate {
  constructor(private telegramService: TelegramService) {}

  canActivate(context: ExecutionContext): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = context.switchToHttp().getRequest();
    // Извлекаем заголовок, который мы настроили во фронтенде (Axios)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
    const initData = request.headers['x-telegram-init-data'];

    if (!initData) {
      // Если данных нет, мы не прерываем (может это обычный браузер),
      // либо выбрасываем ошибку, если вход только через TG
      return true;
    }


    try {
      const botToken = process.env.BOT_TOKEN!; // Токен вашего бота
      const validatedData = this.telegramService.verifyTelegramInitData(
        initData,
        botToken,
      );

      // Сохраняем проверенные данные в объект запроса
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      request.telegramUser = validatedData;
      return true;
    } catch (e) {
      throw new UnauthorizedException('Invalid Telegram data');
    }
  }
}
