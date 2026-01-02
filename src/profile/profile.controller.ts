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

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  getProfile(@User() user: { id: number }) {
    return this.profileService.getProfile(user.id);
  }

  @Patch()
  @UseInterceptors(FileInterceptor('photo', fileInterceptorConfig()))
  updateProfile(
    @User() user: { id: number; companyId: number },
    @Body() dto: UpdateSpecialistDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      dto.photo = `${UPLOAD_URL_PREFIX}/${path.basename(file.path)}`;
    }
    return this.profileService.updateProfile(user.id, user.companyId, dto);
  }

  @Get('schedule')
  getSchedule(@User() user: { id: number; companyId: number }) {
    return this.profileService.getSchedule(user.id, user.companyId);
  }

  @Post('schedule')
  upsertSchedule(
    @User() user: { id: number; companyId: number },
    @Body() dto: CreateScheduleDto,
  ) {
    return this.profileService.upsertSchedule(user.id, user.companyId, dto);
  }

  @Delete('schedule/:day')
  deleteSchedule(
    @User() user: { id: number; companyId: number },
    @Param('day', ParseIntPipe) day: number,
  ) {
    return this.profileService.deleteSchedule(user.id, user.companyId, day);
  }

  @Get('bookings/upcoming')
  getUpcomingBookings(@User() user: { id: number; companyId: number }) {
    return this.profileService.getUpcomingBookings(user.id, user.companyId);
  }

  @Get('bookings/past')
  getPastBookings(@User() user: { id: number; companyId: number }) {
    return this.profileService.getPastBookings(user.id, user.companyId);
  }

  @Patch('change-password')
  changePassword(
    @User() user: { id: number; companyId: number },
    @Body('oldPassword') oldPassword: string,
    @Body('newPassword') newPassword?: string,
  ) {
    return this.profileService.changePassword(
      user.id,
      user.companyId,
      oldPassword,
      newPassword,
    );
  }
}
