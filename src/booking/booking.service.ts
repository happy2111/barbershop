import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import {BookingStatus, Local} from '@prisma/client';
import { TelegramService } from '../telegram/telegram.service';
import { BlockTimeDto } from '../profile/dto/block-time.dto';
import { addMinutes } from '../utils/addMinutes'
import { translations } from '../messages/index.js';

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
  async create(dto: CreateBookingDto, hostname: string, locale: Local = "uz") {
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



    const t = translations[locale] || translations.uz;

    if (company.telegramEnabled && company.telegramBotToken) {
      const totalPrice = booking.services.reduce((sum, bs) => sum + bs.service.price, 0);
      const servicesText = booking.services
        .map((bs) => `• ${bs.service.name} — ${bs.service.price} сум`)
        .join('\n');
      const sourceText = booking.client?.telegramId
        ? t.booking.sourceTelegram
        : t.booking.sourceWeb;

      // --- СООБЩЕНИЕ АДМИНУ ---
      const adminMessage = `
${t.booking.newTitle}

${t.booking.source}: ${sourceText} 
${t.booking.client}: ${booking?.client?.name ?? '---'}
${t.booking.phone}: ${booking?.client?.phone}
${t.booking.specialist}: ${booking.specialist.name}
*${t.booking.services}:*
${servicesText}

*${t.booking.total}:* ${totalPrice} сум
${t.booking.date}: ${booking.date.toLocaleDateString()}
${t.booking.time}: ${booking.start_time} – ${booking.end_time}
${t.booking.link}: https://${company.domain}/booking/${booking.id}
`;

      // --- УВЕДОМЛЕНИЕ АДМИНУ (в группу компании) ---
      if (company.telegramChatId) {
        await this.telegramService.sendMessage(
          company.telegramChatId,
          adminMessage,
          company.telegramBotToken,
        );
      }

      // --- УВЕДОМЛЕНИЕ КЛИЕНТУ (в личные сообщения) ---
      // Проверяем, есть ли у клиента telegramId
      if (booking.client?.telegramId) {
        const displayName = booking.client.name || 'mijoz';

        const clientMessage = `
${t.booking.clientGreeting.replace('{name}', displayName)}

${t.booking.clientSuccess.replace('{companyName}', company.name)}

*${t.booking.specialist}:* ${booking.specialist.name}
*${t.booking.services}:*
${servicesText}

*${t.booking.total}:* ${totalPrice} сум
*${t.booking.date}:* ${booking.date.toLocaleDateString()}
*${t.booking.time}:* ${booking.start_time}

${t.booking.statusInfo}
🔗 https://${company.domain}/booking/${booking.id}

${t.booking.thanks}
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

  async findAll(hostname: string, page: number, limit: number) {
    const company = await this.prisma.company.findUnique({
      where: { domain: hostname },
    });

    if (!company) throw new NotFoundException('Company not found');

    const skip = (page - 1) * limit;

    const [bookings, totalCount] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          companyId: company.id,
          isSystem: false
        },
        // --- ДОБАВЛЕНА СОРТИРОВКА ---
        orderBy: [
          {
            date: 'desc', // Сначала по дате (новые сверху)
          },
          {
            start_time: 'desc', // Если даты одинаковые, сортируем по времени начала
          }
        ],
        // ----------------------------
        skip: skip,
        take: limit,
        include: {
          client: true,
          specialist: {
            select: { id: true, name: true, photo: true, phone: true },
          },
          services: {
            include: { service: { select: { name: true, price: true } } },
          },
        },
      }),
      this.prisma.booking.count({
        where: { companyId: company.id, isSystem: false }
      })
    ]);

    return {
      data: bookings,
      meta: {
        total: totalCount,
        page: page,
        lastPage: Math.ceil(totalCount / limit),
        limit: limit
      }
    };
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

  async changeStatus(id: number, status: BookingStatus, hostname: string, locale: 'ru' | 'uz' | 'en' = 'uz') {
    const booking = await this.findOne(id);
    const company = await this.prisma.company.findUnique({ where: { domain: hostname } });

    if (!company) throw new NotFoundException('Company not found');

    const t = translations[locale] || translations.uz;

    if (booking.client?.telegramId && company.telegramBotToken) {
      const displayName = booking.client.name || (locale === 'ru' ? 'клиент' : 'mijoz');
      const dateStr = booking.date.toLocaleDateString(locale === 'uz' ? 'uz-UZ' : 'ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      const bookingUrl = `https://${company.domain}/booking/${booking.id}`;

      let message = '';

      if (status === BookingStatus.CONFIRMED) {
        const servicesText = booking.services.map(bs => `• ${bs.service.name}`).join('\n');

        message = `
${t.statusMessages.confirmedTitle}

${t.statusMessages.confirmedBody.replace('{name}', displayName).replace('{companyName}', company.name)}

*${t.common.details}:*
${servicesText}

*${t.common.date}:* ${dateStr}
*${t.common.time}:* ${booking.start_time}

${t.statusMessages.waitingYou}
🔗 ${bookingUrl}
`;
      }
      else if (status === BookingStatus.CANCELLED) {
        message = `
${t.statusMessages.cancelledTitle}

${t.statusMessages.cancelledBody
          .replace('{name}', displayName)
          .replace('{companyName}', company.name)
          .replace('{date}', dateStr)
          .replace('{time}', booking.start_time)}

${t.statusMessages.cancelledFooter}
🔗 https://${company.domain}
`;
      }

      if (message) {
        await this.telegramService.sendMessage(
          booking.client.telegramId.toString(),
          message,
          company.telegramBotToken,
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
