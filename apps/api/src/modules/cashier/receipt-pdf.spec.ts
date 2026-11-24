import { writeFileSync } from 'node:fs';
import { formatCop, receiptNumberFor, renderReceiptPdf } from './receipt-pdf';

describe('receipt PDF', () => {
  it('builds a stable receipt number from the payment id and Bogotá date', () => {
    expect(
      receiptNumberFor('ab12cd34-0000-4000-8000-000000000000', new Date('2026-11-24T15:00:00Z')),
    ).toBe('REC-20261124-AB12CD');
  });

  it('formats Colombian pesos without decimals', () => {
    expect(formatCop(1234567.4)).toBe('$ 1.234.567');
  });

  it('renders a PDF document', async () => {
    const pdf = await renderReceiptPdf({
      receiptNumber: 'REC-20261124-AB12CD',
      issuedAt: new Date('2026-11-24T15:00:00Z'),
      clientName: 'María Fernanda López',
      clientDocument: '1085123456',
      clientCode: 'CLI-1085123456',
      clientEmail: 'cliente@example.com',
      invoiceNumber: 'FCT-2026-11-001',
      period: '2026-11',
      amount: 100000,
      paymentMethod: 'CASH',
      receivedBy: 'cajero@example.com',
    });

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1000);
    if (process.env.RECEIPT_PREVIEW_PATH) writeFileSync(process.env.RECEIPT_PREVIEW_PATH, pdf);
  });
});
