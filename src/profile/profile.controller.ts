// src/profile/profile.controller.ts
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
  Request, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateSpecialistDto } from './dto/update-specialist.dto';
import { CreateScheduleDto } from './dto/schedule.dto';
import {JwtAuthGuard} from "../auth/guards/jwt-auth.guard";
import {FileInterceptor} from "@nestjs/platform-express";
import {diskStorage} from "multer";
import path from "node:path";

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // Полный профиль специалиста
  @Get()
  getProfile(@Request() req) {
    return this.profileService.getProfile(req.user.id);
  }

  // Обновить личные данные
// profile.controller.ts
  @Patch()
  @UseInterceptors(FileInterceptor('photo', {
    storage: diskStorage({
      destination: './uploads/specialist/photo',
      filename: (req, file, cb) => {
        const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        cb(null, name);
      },
    }),
  }))
  updateProfile(@Request() req, @Body() dto: UpdateSpecialistDto, @UploadedFile() file?: Express.Multer.File) {
    if (file) {
      const rel = path.relative(process.cwd(), file.path).replace(/\\/g, '/');
      dto.photo = `/${rel}`;
    }
    return this.profileService.updateProfile(req.user.id, dto);
  }

  // Расписание на неделю
  @Get('schedule')
  getSchedule(@Request() req) {
    return this.profileService.getSchedule(req.user.id);
  }

  // Добавить/обновить расписание на день
  @Post('schedule')
  upsertSchedule(@Request() req, @Body() dto: CreateScheduleDto) {
    return this.profileService.upsertSchedule(req.user.id, dto);
  }

  // Удалить расписание на день
  @Delete('schedule/:day')
  deleteSchedule(@Request() req, @Param('day', ParseIntPipe) day: number) {
    return this.profileService.deleteSchedule(req.user.id, day);
  }

  // Предстоящие брони
  @Get('bookings/upcoming')
  getUpcomingBookings(@Request() req) {
    return this.profileService.getUpcomingBookings(req.user.id);
  }

  // Прошедшие брони
  @Get('bookings/past')
  getPastBookings(@Request() req) {
    return this.profileService.getPastBookings(req.user.id);
  }
}