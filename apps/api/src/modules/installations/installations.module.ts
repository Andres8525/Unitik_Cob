import { Module } from '@nestjs/common';
import { InstallationsController } from './installations.controller';
import { InstallationBillingListener } from './installation-billing.listener';

@Module({
  controllers: [InstallationsController],
  providers: [InstallationBillingListener],
})
export class InstallationsModule {}
