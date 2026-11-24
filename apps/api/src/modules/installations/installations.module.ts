import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { InstallationsController } from './installations.controller';
import { InstallationBillingListener } from './installation-billing.listener';

@Module({
  imports: [FilesModule],
  controllers: [InstallationsController],
  providers: [InstallationBillingListener],
})
export class InstallationsModule {}
