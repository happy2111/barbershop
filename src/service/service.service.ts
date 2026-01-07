import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServiceService {
  constructor(private readonly prisma: PrismaService) {}
  async create(dto: CreateServiceDto) {
    // Проверяем, что категория существует
    await this.prisma.service_category.findUniqueOrThrow({
      where: { id: dto.categoryId },
    });

    const data: any = {
      name: dto.name,
      price: dto.price,
      duration_min: dto.duration_min,
      categoryId: dto.categoryId,
      companyId: dto.companyId, // берем из JWT
    };

    if (dto.photo) {
      data.photo = dto.photo;
    }

    return this.prisma.service.create({
      data,
      include: { category: true },
    });
  }

  async findAllByHostname(hostname: string) {
    const company = await this.prisma.company.findFirst({
      where: { domain: hostname },
    }); // или hostname, если поле переименовано
    if (!company) return [];

    return this.prisma.service.findMany({
      where: { companyId: company.id },
      include: {
        category: true,
        specialists: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  async fetchByCategory(categoryId: number, hostname: string) {
    const company = await this.prisma.company.findFirst({
      where: { domain: hostname }, // или hostname, если поле переименовано
    });
    if (!company) return [];

    return this.prisma.service.findMany({
      where: {
        categoryId,
        companyId: company.id,
      },
      include: {
        category: true,
        specialists: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number, hostname: string) {
    const company = await this.prisma.company.findFirst({
      where: { domain: hostname }, // или hostname, если поле так называется
    });
    if (!company) throw new NotFoundException('Company not found');

    const item = await this.prisma.service.findFirst({
      where: {
        id,
        companyId: company.id,
      },
      include: { category: true, specialists: true },
    });

    if (!item) throw new NotFoundException('Service not found');
    return item;
  }

  async update(id: number, dto: UpdateServiceDto) {
    const item = await this.prisma.service.findFirst({
      where: {
        id,
      },
      include: { category: true, specialists: true },
    });

    if (!item) throw new NotFoundException('Service not found');

    if (dto.categoryId !== undefined) {
      await this.prisma.service_category.findUniqueOrThrow({
        where: { id: dto.categoryId },
      });
    }

    // Обновляем сервис
    return this.prisma.service.update({
      where: { id },
      data: { ...dto },
      include: { category: true, specialists: true },
    });
  }
  async remove(id: number, companyId: number) {
    // Проверяем, что сервис существует и принадлежит компании
    const service = await this.prisma.service.findUnique({
      where: { id },
    });

    if (!service) throw new NotFoundException('Service not found');
    if (service.companyId !== companyId) {
      throw new ForbiddenException(
        'You cannot delete a service from another company',
      );
    }

    return this.prisma.service.delete({ where: { id } });
  }
}
