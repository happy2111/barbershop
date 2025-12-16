import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { ServiceService } from './service.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';

@Controller('service')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Get()
  findAll() {
    return this.serviceService.findAll();
  }

  @Get('by-category/:categoryId')
  fetchByCategory(@Param('categoryId', ParseIntPipe) categoryId: number) {
    return this.serviceService.fetchByCategory(categoryId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.serviceService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  @UseInterceptors(FileInterceptor('photo', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads', 'service', 'photo');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, name);
      },
    }),
    fileFilter: (req, file, cb) => {
      if ((file.mimetype || '').startsWith('image/')) cb(null, true);
      else cb(new Error('Only image files are allowed'), false);
    },
  }))
  async create(
    @Body() rawBody: any, // ← специально any, чтобы не было валидации на уровне DTO
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // Вручную парсим и конвертируем поля
    const dto: CreateServiceDto = {
      name: rawBody.name?.trim(),
      price: Number(rawBody.price),
      duration_min: parseInt(rawBody.duration_min, 10),
      categoryId: parseInt(rawBody.categoryId, 10),
    };

    // Проверяем, что числа валидны
    if (!dto.name) throw new BadRequestException('Name is required');
    if (isNaN(dto.price) || dto.price <= 0) throw new BadRequestException('Valid price is required');
    if (isNaN(dto.duration_min) || dto.duration_min < 1) throw new BadRequestException('Valid duration_min (>=1) is required');
    if (isNaN(dto.categoryId)) throw new BadRequestException('Valid categoryId is required');

    if (file) {
      const rel = path.relative(process.cwd(), file.path).replace(/\\/g, '/');
      dto.photo = `/${rel}`;
    }

    return this.serviceService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  @UseInterceptors(FileInterceptor('photo', { /* тот же конфиг */ }))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() rawBody: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const dto: UpdateServiceDto = {};

    if (rawBody.name !== undefined) dto.name = rawBody.name?.trim();
    if (rawBody.price !== undefined) dto.price = Number(rawBody.price);
    if (rawBody.duration_min !== undefined) dto.duration_min = parseInt(rawBody.duration_min, 10);
    if (rawBody.categoryId !== undefined) dto.categoryId = parseInt(rawBody.categoryId, 10);

    if (file) {
      const rel = path.relative(process.cwd(), file.path).replace(/\\/g, '/');
      dto.photo = `/${rel}`;
    }

    return this.serviceService.update(id, dto);
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.serviceService.remove(id);
  }
}
