import { Module } from '@nestjs/common';
import { SpecialistServiceService } from './specialist-service.service';
import { SpecialistServiceController } from './specialist-service.controller';

@Module({
  controllers: [SpecialistServiceController],
  providers: [SpecialistServiceService],
})
export class SpecialistServiceModule {}
