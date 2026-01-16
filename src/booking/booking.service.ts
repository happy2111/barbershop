import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingStatus } from '@prisma/client';
import { TelegramService } from '../telegram/telegram.service';
import { BlockTimeDto } from '../profile/dto/block-time.dto';
import { addMinutes } from '../utils/addMinutes'

@Injectable()
export class BookingService {
  constructor(
    private prisma: PrismaService,
    private readonly telegramService: TelegramService,
  ) {}

  // ------------------------------------------
  // Проверка занятости времени
  // ------------------------------------------
  private async ensureTimeSlotAvailable(
    specialistId: number,
    date: string,
    start: string,
    end: string,
    companyId: number,
  ) {
    const exists = await this.prisma.booking.findFirst({
      where: {
        specialistId,
        companyId,
        date: new Date(date),
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        OR: [
          { start_time: { lte: start }, end_time: { gt: start } },
          { start_time: { lt: end }, end_time: { gte: end } },
          { start_time: { gte: start }, end_time: { lte: end } },
        ],
      },
    });

    if (exists) {
      throw new BadRequestException('Это время уже занято');
    }
  }

  //---------------------------------------------
  // CREATE
  //---------------------------------------------
  async create(dto: CreateBookingDto, hostname: string) {
    const company = await this.prisma.company.findUnique({
      where: { domain: hostname },
    });
    if (!company) throw new NotFoundException('Company not found');

    const services = await this.prisma.service.findMany({
      where: { id: { in: dto.serviceIds }, companyId: company.id },
    });

    if (!services.length) {
      throw new BadRequestException('Выберите хотя бы одну услугу');
    }

    const totalMinutes = services.reduce((sum, s) => sum + s.duration_min, 0);

    const end_time = addMinutes(dto.start_time, totalMinutes);

    // --- Проверяем занятость специалиста ---
    await this.ensureTimeSlotAvailable(
      dto.specialistId,
      dto.date,
      dto.start_time,
      end_time,
      company.id,
    );

    const booking = await this.prisma.booking.create({
      data: {
        clientId: dto.clientId,
        specialistId: dto.specialistId,
        date: new Date(dto.date),
        start_time: dto.start_time,
        end_time: end_time,
        status: dto.status ?? BookingStatus.PENDING,
        companyId: company.id,
        services: {
          create: dto.serviceIds.map((serviceId) => ({ serviceId })),
        },
      },
      include: {
        client: {
          select: { name: true, phone: true, telegramId: true },
        },
        specialist: { select: { name: true } },
        services: {
          include: { service: { select: { name: true, price: true } } },
        },
      },
    });





    if (company.telegramEnabled && company.telegramBotToken) {
      const servicesText = booking.services
        .map((bs) => `• ${bs.service.name} — ${bs.service.price} сум`)
        .join('\n');

      const totalPrice = booking.services.reduce(
        (sum, bs) => sum + bs.service.price,
        0,
      );

      const message = `
📌 *Новое бронирование!*

Клиент: ${booking?.client?.name ?? 'Без имени'}
Телефон: ${booking?.client?.phone}
Специалист: ${booking.specialist.name}
*Услуги:*
${servicesText}

*Итого:* ${totalPrice} сум
Дата: ${booking.date.toLocaleDateString()}
Время: ${booking.start_time} – ${booking.end_time}
Ссылка: https://${company.domain}/booking/${booking.id}
`;

      // --- УВЕДОМЛЕНИЕ АДМИНУ (в группу компании) ---
      if (company.telegramChatId) {
        await this.telegramService.sendMessage(
          company.telegramChatId,
          message,
          company.telegramBotToken,
        );
      }

      // --- УВЕДОМЛЕНИЕ КЛИЕНТУ (в личные сообщения) ---
      // Проверяем, есть ли у клиента telegramId
      if (booking.client?.telegramId) {
        // Определяем имя для обращения: приоритет на имя из БД, затем на имя из Telegram
        const displayName =
          booking.client.name || 'клиент';

        const clientMessage = `
👋 Привет, ${displayName}! 

Вы успешно записались в *${company.name}*.

*Детали вашей записи:*
*Специалист:* ${booking.specialist.name}
*Услуги:*
${servicesText}

*Итого:* ${totalPrice} сум
*Дата:* ${booking.date.toLocaleDateString('ru-RU')}
*Время:* ${booking.start_time}

🔔 *Статус записи:* Вы всегда можете проверить актуальный статус вашей брони по ссылке ниже. Если специалист подтвердит или изменит время, информация обновится там:
🔗 https://${company.domain}/booking/${booking.id}

Спасибо, что выбрали нас!
`;

        await this.telegramService.sendMessage(
          booking.client.telegramId.toString(),
          clientMessage,
          company.telegramBotToken,
        );
      }
    }

    return booking;
  }

  async findAll(hostname: string) {
    const company = await this.prisma.company.findUnique({
      where: { domain: hostname },
    });

    if (!company) throw new NotFoundException('Company not found');

    return this.prisma.booking.findMany({
      where: { companyId: company.id, isSystem: false },
      include: {
        client: true,
        specialist: {
          select: {
            id: true,
            name: true,
            photo: true,
            phone: true,
          },
        },
        services: {
          include: { service: { select: { name: true, price: true } } },
        },
      },
    });
  }

  async getBlockedTimes(companyId: number, specialistId: number) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) throw new NotFoundException('Company not found');

    return this.prisma.booking.findMany({
      where: {
        companyId: company.id,
        specialistId,
        isSystem: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            name: true,
            phone: true,
            telegramId: true,
          },
        },
        specialist: true,
        services: {
          include: { service: { select: { name: true, price: true } } },
        },
      },
    });

    if (!booking) throw new NotFoundException('Запись не найдена');
    return booking;
  }

  async update(id: number, dto: UpdateBookingDto, companyId: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { services: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.companyId !== companyId) {
      throw new BadRequestException('This booking does not belong to the company');
    }

    if (
      dto.start_time ||
      dto.end_time ||
      dto.date ||
      dto.specialistId
    ) {
      await this.ensureTimeSlotAvailable(
        dto.specialistId ?? booking.specialistId,
        dto.date ?? booking.date.toISOString(),
        dto.start_time ?? booking.start_time,
        dto.end_time ?? booking.end_time,
        companyId,
      );
    }

    const { serviceIds, ...bookingData } = dto as any;

    if (bookingData.date) {
      bookingData.date = new Date(bookingData.date);
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.booking.update({
        where: { id },
        data: bookingData,
      });

      if (serviceIds) {
        await tx.booking_service.deleteMany({
          where: { bookingId: id },
        });

        await tx.booking_service.createMany({
          data: serviceIds.map((serviceId) => ({
            bookingId: id,
            serviceId,
          })),
        });
      }

      return updatedBooking;
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.booking.delete({ where: { id } });
  }

  async changeStatus(id: number, status: BookingStatus, hostname: string) {
    const booking = await this.findOne(id);
    const company = await this.prisma.company.findUnique({
      where: { domain: hostname },
    });

    if (!company) throw new NotFoundException('Company not found');

    // Проверяем наличие клиента и ID телеграма
    if (booking.client?.telegramId) {
      const displayName = booking.client.name || 'клиент';
      const dateStr = booking.date.toLocaleDateString('ru-RU');
      const bookingUrl = `https://${company.domain}/booking/${booking.id}`;
      const servicesText = booking.services
        .map((bs) => `• ${bs.service.name} — ${bs.service.price} сум`)
        .join('\n');

      const totalPrice = booking.services.reduce(
        (sum, bs) => sum + bs.service.price,
        0,
      );

      let message = '';

      if (status === BookingStatus.CONFIRMED) {
        message = `
✅ *Запись подтверждена!*

Приятные новости, ${displayName}! Ваша запись в *${company.name}* подтверждена специалистом.

*Детали:*
*Специалист:* ${booking.specialist.name}
*Услуги:*
${servicesText}

*Итого:* ${totalPrice} сум
*Дата:* ${dateStr}
*Время:* ${booking.start_time}

Ждем вас! Если планы изменятся, пожалуйста, сообщите нам заранее или отмените.
🔗 ${bookingUrl}
`;
      } else if (status === BookingStatus.CANCELLED) {
        message = `
❌ *Запись отменена*

Здравствуйте, ${displayName}. К сожалению, ваша запись в *${company.name}* на ${dateStr} в ${booking.start_time} была отменена.

Если у вас возникли вопросы, вы можете связаться с нами или выбрать другое время для записи по ссылке:
🔗 https://${company.domain}
`;
      }

      if (message) {
        await this.telegramService.sendMessage(
          booking.client.telegramId.toString(),
          message,
          company.telegramBotToken ?? undefined,
        );
      }
    }

    return this.prisma.booking.update({
      where: { id },
      data: { status },
    });
  }

  async block(specialistId: number, companyId: number, dto: BlockTimeDto) {
    await this.ensureTimeSlotAvailable(
      specialistId,
      dto.date,
      dto.start_time,
      dto.end_time,
      companyId,
    );

    await this.prisma.booking.create({
      data: {
        companyId,
        specialistId,
        date: new Date(dto.date),
        start_time: dto.start_time,
        end_time: dto.end_time,
        status: BookingStatus.CONFIRMED,
        isSystem: true,
        clientId: null,
        services: {
          create: [],
        },
        ...(dto.reason ? { reason: dto.reason } : {}),
      },
    });
  }
}
