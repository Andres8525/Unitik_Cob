import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { PublicRegistrationRateLimitGuard } from './public-registration-rate-limit.guard';

@Module({
  controllers: [ClientsController],
  providers: [ClientsService, PublicRegistrationRateLimitGuard],
  exports: [ClientsService],
})
export class ClientsModule {}
