import { api } from './http';

/** Collection account published by the administrator (GET/PUT /payments/accounts). */
export interface PaymentAccount {
  method: 'NEQUI' | 'BANK_TRANSFER';
  bank: string;
  accountType?: 'AHORROS' | 'CORRIENTE';
  accountNumber: string;
  holderName: string;
  holderDocument?: string;
  instructions?: string;
}

export const PAYMENT_ACCOUNTS_QUERY_KEY = ['payments', 'accounts'] as const;

export function fetchPaymentAccounts(): Promise<PaymentAccount[]> {
  return api<PaymentAccount[]>('/payments/accounts');
}
