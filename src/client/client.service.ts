import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClientDto) {
    try {
      return this.prisma.client.upsert({
        where: { phone: dto.phone },
        update: {
          name: dto.name,
        },
        create: dto,
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('Phone already in use');
      }
      throw e;
    }
  }


  async findAll() {
    return this.prisma.client.findMany({
      include: { bookings: true },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.client.findUnique({
      where: { id },
      include: { bookings: true },
    });

    if (!item) throw new NotFoundException('Client not found');
    return item;
  }

  async update(id: number, dto: UpdateClientDto) {
    await this.findOne(id); // проверка на существование

    try {
      return await this.prisma.client.update({
        where: { id },
        data: dto,
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('Phone already in use');
      }
      throw e;
    }
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.client.delete({ where: { id } });
  }

  // 🔍 Поиск по номеру телефона
  async findByPhone(phone: string) {
    const client = await this.prisma.client.findUnique({
      where: { phone },
      include: { bookings: true },
    });

    if (!client) throw new NotFoundException('Client not found');
    return client;
  }
}
