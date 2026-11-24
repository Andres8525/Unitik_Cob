import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { PromisesModule } from '../promises/promises.module';
import { CashierController } from './cashier.controller';
import { CashierService } from './cashier.service';
import { ReceiptsService } from './receipts.service';

@Module({
  imports: [PromisesModule, MailModule],
  controllers: [CashierController],
  providers: [CashierService, ReceiptsService],
})
export class CashierModule {}
