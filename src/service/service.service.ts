import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServiceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateServiceDto) {
    // Ensure category exists
    await this.prisma.service_category.findUniqueOrThrow({ where: { id: dto.categoryId } });
    const data: any = {
      name: dto.name,
      price: dto.price,
      duration_min: dto.duration_min,
      categoryId: dto.categoryId,
    };
    if (dto.photo !== undefined) data.photo = dto.photo;
    return this.prisma.service.create({
      data,
      include: { category: true },
    });
  }

  async findAll() {
    return this.prisma.service.findMany({
      include: {
        category: true,
        specialists: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.service.findUnique({
      where: { id },
      include: { category: true, specialists: true },
    });
    if (!item) throw new NotFoundException('Service not found');
    return item;
  }

  async update(id: number, dto: UpdateServiceDto) {
    // Ensure exists
    await this.findOne(id);
    if (dto.categoryId) {
      await this.prisma.service_category.findUniqueOrThrow({ where: { id: dto.categoryId } });
    }
    return this.prisma.service.update({
      where: { id },
      data: { ...dto },
      include: { category: true, specialists: true },
    });
  }

  async remove(id: number) {
    // Ensure exists
    await this.findOne(id);
    return this.prisma.service.delete({ where: { id } });
  }
}
