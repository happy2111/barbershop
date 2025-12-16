import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  Post,
  Delete,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateSpecialistDto } from './dto/update-specialist.dto';
import { CreateScheduleDto } from './dto/schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import path from 'node:path';
import * as fs from 'fs';
import type { Express } from 'express';
const UPLOAD_PATH = '/var/www/barbershop_uploads/specialist/photo';
const UPLOAD_URL_PREFIX = '/uploads/specialist/photo';

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

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  getProfile(@Request() req) {
    return this.profileService.getProfile(req.user.id);
  }

  @Patch()
  @UseInterceptors(FileInterceptor('photo', fileInterceptorConfig()))
  updateProfile(@Request() req, @Body() dto: UpdateSpecialistDto, @UploadedFile() file?: Express.Multer.File) {
    if (file) {
      dto.photo = `${UPLOAD_URL_PREFIX}/${path.basename(file.path)}`;
    }
    return this.profileService.updateProfile(req.user.id, dto);
  }

  @Get('schedule')
  getSchedule(@Request() req) {
    return this.profileService.getSchedule(req.user.id);
  }

  @Post('schedule')
  upsertSchedule(@Request() req, @Body() dto: CreateScheduleDto) {
    return this.profileService.upsertSchedule(req.user.id, dto);
  }

  @Delete('schedule/:day')
  deleteSchedule(@Request() req, @Param('day', ParseIntPipe) day: number) {
    return this.profileService.deleteSchedule(req.user.id, day);
  }

  @Get('bookings/upcoming')
  getUpcomingBookings(@Request() req) {
    return this.profileService.getUpcomingBookings(req.user.id);
  }

  @Get('bookings/past')
  getPastBookings(@Request() req) {
    return this.profileService.getPastBookings(req.user.id);
  }
}
