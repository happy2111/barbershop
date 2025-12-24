import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpecialistDto } from './dto/create-specialist.dto';
import { UpdateSpecialistDto } from './dto/update-specialist.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import * as bcrypt from 'bcryptjs';
import { specialist } from '@prisma/client';

@Injectable()
export class SpecialistService {
  constructor(private prisma: PrismaService) {}

  private toSafe(user: specialist) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, refreshToken, ...rest } = user;
    return rest;
  }

  async create(dto: CreateSpecialistDto, companyId: number) {
    try {
      const hashed = await bcrypt.hash(dto.password, 10);

      const created = await this.prisma.specialist.create({
        data: {
          name: dto.name,
          phone: dto.phone,
          password: hashed,
          role: (dto.role ?? 'SPECIALIST') as any,
          photo: dto.photo ?? null,
          description: dto.description ?? null,
          skills: dto.skills ?? null,

          companyId,
        },
      });

      return this.toSafe(created);
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('Phone already in use');
      }
      throw e;
    }
  }

  async findAllByHostname(hostname: string) {
    const company = await this.prisma.company.findUnique({
      where: { domain: hostname },
    });
    if (!company) return [];

    return this.prisma.specialist.findMany({
      where: {
        role: 'SPECIALIST',
        companyId: company.id,
      },
      select: {
        id: true,
        name: true,
        photo: true,
        description: true,
        skills: true,
      },
    });
  }

  async findOne(id: number, companyId: number) {
    const user = await this.prisma.specialist.findUnique({
      where: { id },
    });

    if (!user) throw new NotFoundException('Specialist not found');

    // Проверка, что специалист принадлежит той же компании
    if (user.companyId !== companyId) {
      throw new NotFoundException('Specialist not found in your company');
    }

    return this.toSafe(user);
  }

  async update(id: number, dto: UpdateSpecialistDto, companyId: number) {
    // Сначала ищем специалиста и проверяем компанию
    const existing = await this.prisma.specialist.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) {
      throw new NotFoundException('Specialist not found in your company');
    }

    const data = { ...dto }; // <-- const вместо let
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    try {
      const updated = await this.prisma.specialist.update({
        where: { id },
        data,
      });
      return this.toSafe(updated);
    } catch (e: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (e?.code === 'P2002') {
        throw new BadRequestException('Phone already in use in this company');
      }
      throw e;
    }
  }

  async remove(id: number, companyId: number) {
    const existing = await this.prisma.specialist.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) {
      throw new NotFoundException('Specialist not found in your company');
    }

    const deleted = await this.prisma.specialist.delete({ where: { id } });
    return this.toSafe(deleted);
  }
  async me(userId: number, companyId: number) {
    const user = await this.prisma.specialist.findUnique({
      where: { id: userId },
    });

    if (!user || user.companyId !== companyId) {
      throw new NotFoundException('Specialist not found in your company');
    }

    return this.toSafe(user);
  }

  async updateMe(userId: number, companyId: number, dto: UpdateMeDto) {
    const existing = await this.prisma.specialist.findUnique({
      where: { id: userId },
    });

    if (!existing || existing.companyId !== companyId) {
      throw new NotFoundException('Specialist not found in your company');
    }

    // Создаём объект только с разрешёнными полями
    const { password, ...rest } = dto;
    const data: Partial<UpdateMeDto> = { ...rest };

    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    const updated = await this.prisma.specialist.update({
      where: { id: userId },
      data,
    });

    return this.toSafe(updated);
  }

  async fetchByServicePublic(serviceId: number, domain: string) {
    const company = await this.prisma.company.findFirst({
      where: { domain },
    });
    if (!company) return [];

    const users = await this.prisma.specialist.findMany({
      where: {
        role: 'SPECIALIST',
        companyId: company.id,
        services: { some: { serviceId } },
      },
      include: { services: true },
      orderBy: { id: 'asc' },
    });

    return users.map((u) => this.toSafe(u));
  }
}
