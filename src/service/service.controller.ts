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
import type { Express } from 'express';

const UPLOAD_PATH = '/var/www/barbershop_uploads/service/photo';
const UPLOAD_URL_PREFIX = '/uploads/service/photo';

function fileInterceptorConfig() {
  return {
    storage: diskStorage({
      destination: (req: any, file: Express.Multer.File, cb: Function) => {
        if (!fs.existsSync(UPLOAD_PATH)) fs.mkdirSync(UPLOAD_PATH, { recursive: true });
        cb(null, UPLOAD_PATH);
      },
      filename: (req: any, file: Express.Multer.File, cb: Function) => {
        const ext = path.extname(file.originalname);
        const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, name);
      },
    }),
    fileFilter: (req: any, file: Express.Multer.File, cb: Function) => {
      if ((file.mimetype || '').startsWith('image/')) cb(null, true);
      else cb(new Error('Only image files are allowed'), false);
    },
  };
}

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
  @UseInterceptors(FileInterceptor('photo', fileInterceptorConfig()))
  async create(
    @Body() rawBody: any,
    @UploadedFile() file?: Express.Multer.File
  ) {
    const dto: CreateServiceDto = {
      name: rawBody.name?.trim(),
      price: Number(rawBody.price),
      duration_min: parseInt(rawBody.duration_min, 10),
      categoryId: parseInt(rawBody.categoryId, 10),
    };

    if (!dto.name) throw new BadRequestException('Name is required');
    if (isNaN(dto.price) || dto.price <= 0) throw new BadRequestException('Valid price is required');
    if (isNaN(dto.duration_min) || dto.duration_min < 1) throw new BadRequestException('Valid duration_min (>=1) is required');
    if (isNaN(dto.categoryId)) throw new BadRequestException('Valid categoryId is required');

    if (file) {
      dto.photo = `${UPLOAD_URL_PREFIX}/${path.basename(file.path)}`;
    }

    return this.serviceService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  @UseInterceptors(FileInterceptor('photo', fileInterceptorConfig()))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() rawBody: any,
    @UploadedFile() file?: Express.Multer.File
  ) {
    const dto: UpdateServiceDto = {};

    if (rawBody.name !== undefined) dto.name = rawBody.name?.trim();
    if (rawBody.price !== undefined) dto.price = Number(rawBody.price);
    if (rawBody.duration_min !== undefined) dto.duration_min = parseInt(rawBody.duration_min, 10);
    if (rawBody.categoryId !== undefined) dto.categoryId = parseInt(rawBody.categoryId, 10);

    if (file) {
      dto.photo = `${UPLOAD_URL_PREFIX}/${path.basename(file.path)}`;
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
