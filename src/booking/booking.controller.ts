import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  UseGuards,
  Headers
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import {BookingStatus, Local} from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/types/AuthRequest';
import { Roles } from '../auth/decorators/roles.decorator';
import { BlockTimeDto } from '../profile/dto/block-time.dto';

@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  create(
    @Body() dto: CreateBookingDto,
    @Query('hostname') hostname: string,
    @Headers('x-client-local') locale: Local
  ) {
    return this.bookingService.create(dto, hostname, locale);
  }

  @Get()
  findAll(@Query('hostname') hostname: string) {
    return this.bookingService.findAll(hostname);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/blocked')
  getBlockedTimes(@User() user: { id: number; companyId: number }) {
    console.log(user);
    console.log(typeof user.id, typeof user.companyId);

    return this.bookingService.getBlockedTimes(user.companyId, user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.bookingService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: number,
    @User() user: { companyId: number },
    @Body() dto: UpdateBookingDto,
  ) {
    return this.bookingService.update(id, dto, user.companyId);
  }

  @Patch(':id/status/:status')
  changeStatus(
    @Param('id') id: number,
    @Param('status') status: BookingStatus,
    @Query ('hostname') hostname: string,
    @Headers('x-client-local') locale: "uz" | "ru" | "en" | undefined
  ) {
    return this.bookingService.changeStatus(+id, status, hostname, locale);
  }

  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.bookingService.remove(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'SPECIALIST')
  @Post('/block')
  block(
    @User() user: { id: number; companyId: number },
    @Body()
    dto: BlockTimeDto,
  ) {
    return this.bookingService.block(user.id, user.companyId, dto);
  }
}
