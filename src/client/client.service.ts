import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  allows_write_to_pm?: boolean;
  photo_url?: string;
}

export interface TelegramValidatedData {
  user?: TelegramUser;
  auth_date: string;
  hash: string;
  query_id?: string;
  // Добавьте другие поля, если они приходят из initData
}

@Injectable()
export class ClientService {
  constructor(private readonly prisma: PrismaService) {}

  private mapTelegramFields(dto: CreateClientDto | UpdateClientDto) {
    return {
      telegramId: dto.telegramId ? BigInt(dto.telegramId) : undefined,
      telegramUsername: dto.telegramUsername,
      telegramFirstName: dto.telegramFirstName,
      telegramLastName: dto.telegramLastName,
      telegramLang: dto.telegramLang,
    };
  }

  async create(
    dto: CreateClientDto,
    hostname: string,
    tgDataFromGuard?: TelegramValidatedData, // Заменили any на интерфейс
  ) {
    const company = await this.prisma.company.findUnique({
      where: { domain: hostname },
    });

    if (!company) {
      throw new BadRequestException('Company not found');
    }

    // Извлекаем пользователя для удобства
    const tgUser = tgDataFromGuard?.user;

    // Безопасное приведение к BigInt
    const finalTelegramId: bigint | null = tgUser?.id
      ? BigInt(tgUser.id)
      : dto.telegramId
        ? BigInt(dto.telegramId)
        : null;

    // Формируем объект данных Telegram, чтобы не дублировать код в upsert
    const telegramFields = {
      telegramId: finalTelegramId,
      telegramUsername: tgUser?.username ?? dto.telegramUsername ?? null,
      telegramFirstName: tgUser?.first_name ?? dto.telegramFirstName ?? null,
      telegramLastName: tgUser?.last_name ?? dto.telegramLastName ?? null,
      telegramLang: tgUser?.language_code ?? dto.telegramLang ?? null,
    };

    try {
      return await this.prisma.client.upsert({
        where: {
          companyId_phone: {
            companyId: company.id,
            phone: dto.phone,
          },
        },
        update: {
          name: dto.name,
          ...telegramFields,
        },
        create: {
          companyId: company.id,
          name: dto.name,
          phone: dto.phone,
          ...telegramFields,
        },
      });
    } catch (e: unknown) {
      // Проверка кода ошибки Prisma без использования any
      if (typeof e === 'object' && e !== null && 'code' in e) {
        if ((e as { code: string }).code === 'P2002') {
          throw new BadRequestException(
            'Этот номер телефона или Telegram аккаунт уже занят в этой компании',
          );
        }
      }
      throw e;
    }
  }

  async findAll(companyId: number) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Company not found');

    return this.prisma.client.findMany({
      where: { companyId },
      include: { bookings: true },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number, companyId: number) {
    const item = await this.prisma.client.findFirst({
      where: { id, companyId },
      include: { bookings: true },
    });

    if (!item) throw new NotFoundException('Client not found');
    return item;
  }

  async update(id: number, dto: UpdateClientDto, companyId: number) {
    const client = await this.prisma.client.findFirst({
      where: { id, companyId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    try {
      return await this.prisma.client.update({
        where: { id },
        data: {
          name: dto.name,
          phone: dto.phone,
          ...this.mapTelegramFields(dto),
        },
      });
    } catch (e: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (e?.code === 'P2002') {
        throw new BadRequestException('Phone already in use');
      }
      throw e;
    }
  }

  async remove(id: number, companyId: number) {
    const client = await this.prisma.client.findFirst({
      where: { id, companyId },
    });

    if (!client) throw new NotFoundException('Client not found');

    return this.prisma.client.delete({
      where: { id },
    });
  }

  async findByPhone(phone: string, companyId: number) {
    return this.prisma.client.findMany({
      where: {
        companyId,
        phone: {
          contains: phone, // Ищет вхождение строки в номер
          // mode: 'insensitive', // Если нужно игнорировать регистр (для цифр обычно не важно)
        },
      },
      take: 10, // Ограничиваем до 10 результатов для скорости
      include: { bookings: true },
    });
  }
}
