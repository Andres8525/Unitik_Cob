import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentAccountDto } from './dto/payment-accounts.dto';

export const PAYMENT_ACCOUNTS_KEY = 'payment_accounts';

/**
 * Collection accounts shown to clients when they report a digital
 * payment. Stored as JSON in system_config so the administrator can
 * change them without a deployment (no account numbers in the code).
 */
@Injectable()
export class PaymentAccountsService {
  private readonly logger = new Logger(PaymentAccountsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<PaymentAccountDto[]> {
    const row = await this.prisma.systemConfig.findUnique({ where: { key: PAYMENT_ACCOUNTS_KEY } });
    if (!row) return [];
    try {
      const parsed: unknown = JSON.parse(row.value);
      return Array.isArray(parsed) ? (parsed as PaymentAccountDto[]) : [];
    } catch {
      this.logger.warn('system_config.payment_accounts no contiene JSON válido');
      return [];
    }
  }

  async replace(
    accounts: PaymentAccountDto[],
    userId: string,
  ): Promise<{ accounts: PaymentAccountDto[]; previous: PaymentAccountDto[] }> {
    const previous = await this.list();
    const normalized = accounts.map((account) => ({
      ...account,
      bank: account.bank.trim(),
      accountNumber: account.accountNumber.trim(),
      holderName: account.holderName.trim(),
      ...(account.method === 'NEQUI' ? { accountType: undefined } : {}),
    }));
    const value = JSON.stringify(normalized);
    await this.prisma.systemConfig.upsert({
      where: { key: PAYMENT_ACCOUNTS_KEY },
      create: {
        key: PAYMENT_ACCOUNTS_KEY,
        value,
        description: 'Cuentas de recaudo visibles para el cliente al reportar pagos',
        updatedBy: userId,
      },
      update: { value, updatedBy: userId },
    });
    return { accounts: normalized, previous };
  }
}
