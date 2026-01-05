// src/dashboard/dashboard.controller.ts
import {
  Controller,
  Get,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/types/AuthRequest';
import {
  RevenueQueryDto,
  GraphQueryDto,
  BookingsCountQueryDto,
  SpecialistsLoadQueryDto,
  PopularServicesQueryDto,
  LostMoneyQueryDto,
  RepeatClientsQueryDto,
  BestSpecialistQueryDto,
  AverageCheckQueryDto,
  PeakHoursQueryDto,
} from './dto/dashboard.dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('revenue')
  getRevenue(
    @User() user: { companyId: number },
    @Query() query: RevenueQueryDto,
  ) {
    return this.dashboardService.getRevenue(user.companyId, query.period);
  }

  @Get('revenue-graph')
  getRevenueGraph(
    @User() user: { companyId: number },
    @Query() query: GraphQueryDto,
  ) {
    return this.dashboardService.getRevenueGraph(user.companyId, query.days);
  }

  @Get('bookings-count')
  getBookingsCount(
    @User() user: { companyId: number },
    @Query() query: BookingsCountQueryDto,
  ) {
    return this.dashboardService.getBookingsCount(user.companyId, query.period);
  }

  @Get('bookings-graph')
  getBookingsGraph(
    @User() user: { companyId: number },
    @Query() query: GraphQueryDto,
  ) {
    return this.dashboardService.getBookingsGraph(user.companyId, query.days);
  }

  @Get('specialists-load')
  getSpecialistsLoad(
    @User() user: { companyId: number },
    @Query() query: SpecialistsLoadQueryDto,
  ) {
    return this.dashboardService.getSpecialistsLoad(
      user.companyId,
      query.period,
    );
  }

  // In your Controller
  @Get('popular-services')
  getPopularServices(
    @User() user: { companyId: number },
    @Query() query: PopularServicesQueryDto,
  ): Promise<any[]> {
    return this.dashboardService.getPopularServices(
      user.companyId,
      query.top,
      query.type,
      query.period,
    );
  }

  @Get('lost-money')
  getLostMoney(
    @User() user: { companyId: number },
    @Query() query: LostMoneyQueryDto,
  ) {
    return this.dashboardService.getLostMoney(user.companyId, query.period);
  }

  @Get('repeat-clients')
  getRepeatClients(
    @User() user: { companyId: number },
    @Query() query: RepeatClientsQueryDto,
  ) {
    return this.dashboardService.getRepeatClients(user.companyId, query.period);
  }

  @Get('best-specialist')
  getBestSpecialist(
    @User() user: { companyId: number },
    @Query() query: BestSpecialistQueryDto,
  ) {
    return this.dashboardService.getBestSpecialist(
      user.companyId,
      query.type,
      query.period,
    );
  }

  @Get('average-check')
  getAverageCheck(
    @User() user: { companyId: number },
    @Query() query: AverageCheckQueryDto,
  ) {
    return this.dashboardService.getAverageCheck(user.companyId, query.period);
  }

  @Get('peak-hours')
  getPeakHours(
    @User() user: { companyId: number },
    @Query() query: PeakHoursQueryDto,
  ) {
    return this.dashboardService.getPeakHours(user.companyId, query.period);
  }
}
