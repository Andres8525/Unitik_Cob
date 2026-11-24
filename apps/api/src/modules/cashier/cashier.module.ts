import { Module } from '@nestjs/common';
import { PromisesModule } from '../promises/promises.module';
import { CashierController } from './cashier.controller';
import { CashierService } from './cashier.service';
import { ReceiptsService } from './receipts.service';

@Module({
  imports: [PromisesModule],
  controllers: [CashierController],
  providers: [CashierService, ReceiptsService],
})
export class CashierModule {}
