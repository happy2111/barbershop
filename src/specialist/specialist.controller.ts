import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { SpecialistService } from './specialist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateSpecialistDto } from './dto/create-specialist.dto';
import { UpdateSpecialistDto } from './dto/update-specialist.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateMeDto } from './dto/update-me.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';

import type { Express } from 'express';


@Controller('specialist')
export class SpecialistController {
  constructor(private readonly specialistService: SpecialistService) {}

  // Admin-only create
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  @UseInterceptors(FileInterceptor('photo', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads', 'specialist', 'photo');
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
  create(@Body() dto: CreateSpecialistDto, @UploadedFile() file?: Express.Multer.File) {
    if (file) {
      const rel = path.relative(process.cwd(), file.path).replace(/\\/g, '/');
      dto.photo = `/${rel}`;
    }
    return this.specialistService.create(dto);
  }

  @Get()
  findAll() {
    return this.specialistService.findAll();
  }

  @Get('by-service/:serviceId')
  fetchByService(@Param('serviceId', ParseIntPipe) serviceId: number) {
    return this.specialistService.fetchByService(serviceId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.specialistService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  @UseInterceptors(FileInterceptor('photo', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads', 'specialist', 'photo');
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
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSpecialistDto, @UploadedFile() file?: Express.Multer.File) {
    if (file) {
      const rel = path.relative(process.cwd(), file.path).replace(/\\/g, '/');
      dto.photo = `/${rel}`;
    }
    return this.specialistService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.specialistService.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/profile')
  me(@CurrentUser() user: any) {
    return this.specialistService.me(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/profile')
  @UseInterceptors(FileInterceptor('photo', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads', 'specialist', 'photo');
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
  updateMe(@CurrentUser() user: any, @Body() dto: UpdateMeDto, @UploadedFile() file?: Express.Multer.File) {
    if (file) {
      const rel = path.relative(process.cwd(), file.path).replace(/\\/g, '/');
      dto.photo = `/${rel}`;
    }
    return this.specialistService.updateMe(user.id, dto);
  }
}
