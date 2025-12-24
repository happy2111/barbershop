import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';

@Injectable()
export class ServiceCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateServiceCategoryDto, companyId: number) {
    try {
      return await this.prisma.service_category.create({
        data: {
          name: dto.name,
          companyId,
        },
      });
    } catch (e: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (e?.code === 'P2002') {
        throw new BadRequestException(
          'Service category with this name already exists',
        );
      }
      throw e;
    }
  }

  async findAllByHostname(hostname: string) {
    const company = await this.prisma.company.findUnique({
      where: { domain: hostname },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return this.prisma.service_category.findMany({
      where: {
        companyId: company.id,
      },
      include: {
        services: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  async findAllByCompany(companyId: number) {
    return this.prisma.service_category.findMany({
      where: {
        companyId,
      },
      include: {
        services: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  async findOneByHostname(id: number, hostname: string) {
    const company = await this.prisma.company.findUnique({
      where: { domain: hostname },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const item = await this.prisma.service_category.findFirst({
      where: {
        id,
        companyId: company.id,
      },
      include: {
        services: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Service category not found');
    }

    return item;
  }

  async update(id: number, dto: UpdateServiceCategoryDto, companyId: number) {
    const existing = await this.prisma.service_category.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Service category not found');
    }

    return this.prisma.service_category.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number, companyId: number) {
    const existing = await this.prisma.service_category.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Service category not found');
    }

    return this.prisma.service_category.delete({
      where: { id },
    });
  }
}
