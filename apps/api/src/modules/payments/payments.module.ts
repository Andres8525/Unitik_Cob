import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { PromisesModule } from '../promises/promises.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { WompiService } from './wompi.service';

@Module({
  imports: [PromisesModule, FilesModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, WompiService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
