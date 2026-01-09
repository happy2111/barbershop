import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
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
import { User } from '../auth/types/AuthRequest';

const UPLOAD_PATH = '/var/www/barbershop_uploads/specialist/photo';
const UPLOAD_URL_PREFIX = '/uploads/specialist/photo';

function fileInterceptorConfig() {
  return {
    storage: diskStorage({
      destination: (req: any, file: Express.Multer.File, cb: Function) => {
        if (!fs.existsSync(UPLOAD_PATH))
          fs.mkdirSync(UPLOAD_PATH, { recursive: true });
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

@Controller('specialist')
export class SpecialistController {
  constructor(private readonly specialistService: SpecialistService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  @UseInterceptors(FileInterceptor('photo', fileInterceptorConfig()))
  create(
    @Body() dto: CreateSpecialistDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @User() user: { companyId: number },
  ) {
    if (file) {
      dto.photo = `${UPLOAD_URL_PREFIX}/${path.basename(file.path)}`;
    }

    return this.specialistService.create(dto, user.companyId);
  }

  @Get('public')
  findAllPublic(@Query('hostname') hostname: string) {
    return this.specialistService.findAllByHostname(hostname);
  }

  @Get('by-service/:serviceId')
  fetchByServicePublic(
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Query('hostname') domain: string,
  ) {
    return this.specialistService.fetchByServicePublic(serviceId, domain);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @User() user: { companyId: number },
  ) {
    return this.specialistService.findOne(id, user.companyId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  @UseInterceptors(FileInterceptor('photo', fileInterceptorConfig()))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSpecialistDto,
    @User() user: { companyId: number },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      dto.photo = `${UPLOAD_URL_PREFIX}/${path.basename(file.path)}`;
    }
    return this.specialistService.update(id, dto, user.companyId);
  }

  @Get('private')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  findAllPrivate(
    @User() user: { companyId: number },
  ){
    return this.specialistService.findAllPrivate(user.companyId)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @User() user: { companyId: number },
  ) {
    return this.specialistService.remove(id, user.companyId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/profile')
  me(@CurrentUser() user: { id: number; companyId: number }) {
    return this.specialistService.me(user.id, user.companyId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/profile')
  @UseInterceptors(FileInterceptor('photo', fileInterceptorConfig()))
  updateMe(
    @CurrentUser() user: { id: number; companyId: number },
    @Body() dto: UpdateMeDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      dto.photo = `${UPLOAD_URL_PREFIX}/${path.basename(file.path)}`;
    }
    return this.specialistService.updateMe(user.id, user.companyId, dto);
  }
}
