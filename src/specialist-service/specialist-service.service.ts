import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpecialistServiceDto } from './dto/create-specialist-service.dto';
import { UpdateSpecialistServiceDto } from './dto/update-specialist-service.dto';

@Injectable()
export class SpecialistServiceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSpecialistServiceDto) {
    // Проверяем что мастер существует
    const specialist = await this.prisma.specialist.findUnique({
      where: { id: dto.specialistId }
    });
    if (!specialist) throw new NotFoundException('Specialist not found');

    // Проверяем что услуга существует
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId }
    });
    if (!service) throw new NotFoundException('Service not found');

    try {
      return await this.prisma.specialist_service.create({
        data: {
          specialistId: dto.specialistId,
          serviceId: dto.serviceId,
        },
        include: {
          specialist: true,
          service: true,
        }
      });
    } catch (err) {
      if (err.code === 'P2002') {
        throw new BadRequestException('This service is already linked to specialist');
      }
      throw err;
    }
  }

  async findAll() {
    return this.prisma.specialist_service.findMany({
      include: { specialist: true, service: true },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.specialist_service.findUnique({
      where: { id },
      include: { specialist: true, service: true },
    });
    if (!item) throw new NotFoundException('Relation not found');
    return item;
  }

  async update(id: number, dto: UpdateSpecialistServiceDto) {
    await this.findOne(id);

    return this.prisma.specialist_service.update({
      where: { id },
      data: dto,
      include: { specialist: true, service: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.specialist_service.delete({
      where: { id },
    });
  }

  // Получить все услуги конкретного специалиста
  async findBySpecialist(id: number) {
    return this.prisma.specialist_service.findMany({
      where: { specialistId: id },
      include: { service: true },
    });
  }

  // Получить всех специалистов предоставляющих услугу
  async findByService(id: number) {
    return this.prisma.specialist_service.findMany({
      where: { serviceId: id },
      include: { specialist: true },
    });
  }
}
