import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpecialistDto } from './dto/create-specialist.dto';
import { UpdateSpecialistDto } from './dto/update-specialist.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SpecialistService {
  constructor(private prisma: PrismaService) {}

  private toSafe(user: any) {
    if (!user) return user;
    const { password, refreshToken,role, ...rest } = user;
    return rest;
  }

  async create(dto: CreateSpecialistDto) {
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

  async findAll() {
    const users = await this.prisma.specialist.findMany({where: {role: "SPECIALIST"}});
    return users.map((u) => this.toSafe(u));
  }

  async findOne(id: number) {
    const user = await this.prisma.specialist.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Specialist not found');
    return this.toSafe(user);
  }

  async update(id: number, dto: UpdateSpecialistDto) {
    let data: any = { ...dto };
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }
    try {
      const updated = await this.prisma.specialist.update({ where: { id }, data });
      return this.toSafe(updated);
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('Phone already in use');
      }
      throw e;
    }
  }

  async remove(id: number) {
    try {
      const deleted = await this.prisma.specialist.delete({ where: { id } });
      return this.toSafe(deleted);
    } catch (e: any) {
      throw new NotFoundException('Specialist not found');
    }
  }

  async me(userId: number) {
    return this.findOne(userId);
  }

  async updateMe(userId: number, dto: UpdateMeDto) {
    const data: any = { ...dto };
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }
    delete data.role;
    delete data.phone;
    const updated = await this.prisma.specialist.update({ where: { id: userId }, data });
    return this.toSafe(updated);
  }

  async fetchByService(serviceId: number) {
    const users = await this.prisma.specialist.findMany({
      where: {
        role: 'SPECIALIST' as any,
        services: { some: { serviceId } },
      },
      include: { services: true },
      orderBy: { id: 'asc' },
    });
    return users.map((u) => this.toSafe(u));
  }
}
