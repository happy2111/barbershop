import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { SpecialistModule } from './specialist/specialist.module';
import { AuthModule } from './auth/auth.module';
import { ServiceCategoryModule } from './service-category/service-category.module';
import { ServiceModule } from './service/service.module';
import { ClientModule } from './client/client.module';
import { SpecialistServiceModule } from './specialist-service/specialist-service.module';
import { ScheduleModule } from './schedule/schedule.module';
import { BookingModule } from './booking/booking.module';
import { ProfileModule } from './profile/profile.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    SpecialistModule,
    AuthModule,
    ServiceCategoryModule,
    ServiceModule,
    ClientModule,
    SpecialistServiceModule,
    ScheduleModule,
    BookingModule,
    ProfileModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
