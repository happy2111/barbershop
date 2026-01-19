import {
  Body,
  Controller,
  Delete,
  Get, Headers, Logger,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientService } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../auth/types/AuthRequest';
import { TelegramAuthGuard } from '../telegram/guards/TelegramAuthGuard';
import {Local} from "@prisma/client";

@Controller('client')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  findAll(
    @User() user: { companyId: number },
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    return this.clientService.findAll(user.companyId, pageNum, limitNum);
  }

  @Get('search/phone')
  @UseGuards(JwtAuthGuard)
  async findByPhone(
    @Query('phone') phone: string,
    @User() user: { companyId: number },
  ) {
    if (!phone) return [];
    return this.clientService.findByPhone(phone, user.companyId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @User() user: { companyId: number },
  ) {
    return this.clientService.findOne(id, user.companyId);
  }

  @Post()
  @UseGuards(TelegramAuthGuard)
  create(
    @Body() dto: CreateClientDto,
    @Query('hostname') hostname: string,
    @Req() req: any,
    @Headers('x-client-local') local: Local
  ) {
    Logger.log(local);
    console.log(local);
    const tgData: any = req.telegramUser;
    return this.clientService.create(dto, hostname, tgData, local);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClientDto,
    @User() user: { companyId: number },
  ) {
    return this.clientService.update(id, dto, user.companyId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @User() user: { companyId: number },
  ) {
    return this.clientService.remove(id, user.companyId);
  }
}
