import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClientDto) {
    return this.prisma.client.create({
      data: dto,
    });
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

    return this.prisma.client.update({
      where: { id },
      data: dto,
    });
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
