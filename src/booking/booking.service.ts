import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class BookingService {
  constructor(private prisma: PrismaService) {}

  // ------------------------------------------
  // Проверка занятости времени
  // ------------------------------------------
  private async ensureTimeSlotAvailable(
    specialistId: number,
    date: string,
    start: string,
    end: string,
  ) {
    const exists = await this.prisma.booking.findFirst({
      where: {
        specialistId,
        date: new Date(date),
        status: {
          in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
        },
        OR: [
          // start_inside existing
          {
            start_time: { lte: start },
            end_time: { gt: start },
          },
          // end_inside existing
          {
            start_time: { lt: end },
            end_time: { gte: end },
          },
          // fully inside existing
          {
            start_time: { gte: start },
            end_time: { lte: end },
          },
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
  async create(dto: CreateBookingDto) {
    await this.ensureTimeSlotAvailable(
      dto.specialistId,
      dto.date,
      dto.start_time,
      dto.end_time,
    );

    return this.prisma.booking.create({ data: dto });
  }

  //---------------------------------------------
  // FIND ALL (фильтры по необходимости)
  //---------------------------------------------
  async findAll(params?: any) {
    return this.prisma.booking.findMany({
      where: params?.where,
      include: {
        client: true,
        specialist: true,
        service: true,
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

  //---------------------------------------------
  // UPDATE
  //---------------------------------------------
  async update(id: number, dto: UpdateBookingDto) {
    const booking = await this.findOne(id);

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
      );
    }

    return this.prisma.booking.update({
      where: { id },
      data: dto,
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
}
