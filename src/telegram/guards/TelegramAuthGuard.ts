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
    const request = context.switchToHttp().getRequest();
    const initData = request.headers['x-telegram-init-data'];

    console.log('--- GUARD LOG START ---');
    console.log('X-Telegram-Init-Data header exists:', !!initData);
    if (initData) {
      console.log('Raw Header Value:', initData);
    }
    console.log('--- GUARD LOG END ---');

    if (!initData) return true; // Разрешаем, если заголовка нет (обычный браузер)

    try {
      const validatedData =
        this.telegramService.verifyTelegramInitData(initData);
      request.telegramUser = validatedData;
      return true;
    } catch (e) {
      console.error('Guard verification failed:', e.message);
      throw new UnauthorizedException('Invalid Telegram data');
    }
  }
}
