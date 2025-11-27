import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingStatus } from '@prisma/client';

@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  create(@Body() dto: CreateBookingDto) {
    return this.bookingService.create(dto);
  }

  @Get()
  findAll() {
    return this.bookingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.bookingService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() dto: UpdateBookingDto) {
    return this.bookingService.update(+id, dto);
  }

  @Patch(':id/status/:status')
  changeStatus(
    @Param('id') id: number,
    @Param('status') status: BookingStatus,
  ) {
    return this.bookingService.changeStatus(+id, status);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.bookingService.remove(+id);
  }
}
