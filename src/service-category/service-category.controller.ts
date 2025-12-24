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
import { ServiceCategoryService } from './service-category.service';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../auth/types/AuthRequest';

@Controller('service-category')
export class ServiceCategoryController {
  constructor(
    private readonly serviceCategoryService: ServiceCategoryService,
  ) {}

  @Get()
  findAll(@Query('hostname') hostname: string) {
    return this.serviceCategoryService.findAllByHostname(hostname);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin')
  findAllAdmin(@User() user: { companyId: number }) {
    return this.serviceCategoryService.findAllByCompany(user.companyId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('hostname') hostname: string,
  ) {
    return this.serviceCategoryService.findOneByHostname(id, hostname);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(
    @Body() dto: CreateServiceCategoryDto,
    @User() user: { companyId: number },
  ) {
    return this.serviceCategoryService.create(dto, user.companyId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServiceCategoryDto,
    @User() user: { companyId: number },
  ) {
    return this.serviceCategoryService.update(id, dto, user.companyId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @User() user: { companyId: number },
  ) {
    return this.serviceCategoryService.remove(id, user.companyId);
  }
}
