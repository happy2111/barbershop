import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { SpecialistServiceService } from './specialist-service.service';
import { CreateSpecialistServiceDto } from './dto/create-specialist-service.dto';
import { UpdateSpecialistServiceDto } from './dto/update-specialist-service.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('specialist-service')
export class SpecialistServiceController {
  constructor(private readonly service: SpecialistServiceService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('specialist/:id')
  findBySpecialist(@Param('id', ParseIntPipe) id: number) {
    return this.service.findBySpecialist(id);
  }

  @Get('service/:id')
  findByService(@Param('id', ParseIntPipe) id: number) {
    return this.service.findByService(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateSpecialistServiceDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSpecialistServiceDto,
  ) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
