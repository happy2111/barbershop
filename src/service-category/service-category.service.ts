import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';

@Injectable()
export class ServiceCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateServiceCategoryDto) {
    return this.prisma.service_category.create({
      data: { name: dto.name },
    });
  }

  async findAll() {
    return this.prisma.service_category.findMany({
      include: { services: true },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.service_category.findUnique({
      where: { id },
      include: { services: true },
    });
    if (!item) throw new NotFoundException('Service category not found');
    return item;
  }

  async update(id: number, dto: UpdateServiceCategoryDto) {
    // Ensure exists
    await this.findOne(id);
    return this.prisma.service_category.update({
      where: { id },
      data: { ...dto },
    });
  }

  async remove(id: number) {
    // Ensure exists
    await this.findOne(id);
    return this.prisma.service_category.delete({ where: { id } });
  }
}
