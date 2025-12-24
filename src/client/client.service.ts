import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClientDto, hostname: string) {
    // Находим компанию по домену
    const company = await this.prisma.company.findUnique({
      where: { domain: hostname },
    });

    if (!company) {
      throw new BadRequestException('Company not found');
    }

    try {
      return this.prisma.client.upsert({
        where: {
          companyId_phone: {
            companyId: company.id,
            phone: dto.phone,
          },
        },
        update: {
          name: dto.name,
        },
        create: {
          ...dto,
          companyId: company.id,
        },
      });
    } catch (e: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (e?.code === 'P2002') {
        throw new BadRequestException('Phone already in use for this company');
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

    if (!client) throw new NotFoundException('Client not found');

    try {
      return await this.prisma.client.update({
        where: { id },
        data: dto,
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
    const client = await this.prisma.client.findFirst({
      where: { phone, companyId },
      include: { bookings: true },
    });

    if (!client) throw new NotFoundException('Client not found');
    return client;
  }
}
