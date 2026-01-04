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
    // Находим компанию по hostname
    const company = await this.prisma.company.findUnique({
      where: { domain: hostname },
    });
    if (!company) throw new NotFoundException('Company not found');

    // Проверяем доступность времени
    await this.ensureTimeSlotAvailable(
      dto.specialistId,
      dto.date,
      dto.start_time,
      dto.end_time,
      company.id,
    );

    const data: any = {
      ...dto,
      date: new Date(dto.date),
      companyId: company.id,
    };
    delete data.hostname;

    // Создаём бронирование
    const booking = await this.prisma.booking.create({
      data,
      include: {
        client: {
          select: {
            name: true,
            phone: true,
          },
        },
        specialist: {
          select: {
            name: true,
          },
        },
        service: {
          select: {
            name: true,
            price: true,
          },
        },
      },
    });

    // -----------------------------
    // Отправка уведомления в Telegram, если включено
    // -----------------------------
    if (company.telegramEnabled && company.telegramChatId) {
      const message = `
📌 *Новое бронирование!*

Клиент: ${booking?.client?.name ?? 'Без имени'} (${booking?.client?.phone})
Специалист: ${booking.specialist.name}
Услуга: ${booking?.service?.name} (${booking?.service?.price} сум)
Дата: ${booking.date.toLocaleDateString()}
Время: ${booking.start_time} – ${booking.end_time}
`;

      await this.telegramService.sendMessage(company.telegramChatId, message);
    }

    return booking;
  }

  //---------------------------------------------
  // FIND ALL (фильтры по необходимости)
  //---------------------------------------------
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
        service: true,
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
  //---------------------------------------------
  // FIND ONE
  //---------------------------------------------
  async findOne(id: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        client: true,
        specialist: true,
        service: true,
      },
    });

    if (!booking) throw new NotFoundException('Запись не найдена');
    return booking;
  }

  async update(id: number, dto: UpdateBookingDto, companyId: number) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Company not found');

    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    // Проверяем принадлежность брони компании
    if (booking.companyId !== company.id) {
      throw new BadRequestException(
        'This booking does not belong to the company',
      );
    }

    // Если время меняется — снова проверяем занятость
    if (
      (dto.start_time && dto.start_time !== booking.start_time) ||
      (dto.end_time && dto.end_time !== booking.end_time) ||
      (dto.date && dto.date !== booking.date.toISOString())
    ) {
      await this.ensureTimeSlotAvailable(
        dto.specialistId ?? booking.specialistId,
        dto.date ?? booking.date.toISOString(),
        dto.start_time ?? booking.start_time,
        dto.end_time ?? booking.end_time,
        company.id, // фильтруем по компании
      );
    }

    const data: any = { ...dto };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (dto.date) data.date = new Date(dto.date);

    return this.prisma.booking.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data,
    });
  }

  //---------------------------------------------
  // DELETE
  //---------------------------------------------
  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.booking.delete({ where: { id } });
  }

  //---------------------------------------------
  // Изменение статуса
  //---------------------------------------------
  async changeStatus(id: number, status: BookingStatus) {
    await this.findOne(id);

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
        ...(dto.reason ? { reason: dto.reason } : {}),
      },
    });
  }
}
