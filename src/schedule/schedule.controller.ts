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
  UseGuards,
} from '@nestjs/common';

import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../auth/types/AuthRequest';

@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  findAll(@Query('hostname') hostname: string) {
    return this.scheduleService.findAll(hostname);
  }

  @Get('specialist/:id')
  findBySpecialist(
    @Param('id', ParseIntPipe) id: number,
    @Query('hostname') hostname: string,
  ) {
    return this.scheduleService.findBySpecialist(id, hostname);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('hostname') hostname: string,
  ) {
    return this.scheduleService.findOne(id, hostname);
  }

  @Post()
  async create(
    @Body() dto: CreateScheduleDto,
    @Query('hostname') hostname: string,
  ) {
    return this.scheduleService.create(dto, hostname);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScheduleDto,
    @User() user: { companyId: number },
  ) {
    return this.scheduleService.update(id, dto, user.companyId);
  }

  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @User() user: { companyId: number },
  ) {
    return this.scheduleService.remove(id, user.companyId);
  }

  @Get(':id/free-slots')
  async getFreeSlots(
    @Param('id', ParseIntPipe) specialistId: number,
    @Query('serviceId', ParseIntPipe) serviceId: number,
    @Query('date') date: string,
    @User() user: { companyId: number }, // берём из JWT
  ) {
    return this.scheduleService.getFreeSlots(
      specialistId,
      serviceId,
      date,
      user.companyId,
    );
  }
}
