import { describe, expect, it } from 'vitest';
import { reportePagoSchema } from './reportePago';

const validReport = {
  invoiceId: 'invoice-1',
  paymentMethod: 'NEQUI' as const,
  reference: 'NQ123456',
  file: new File(['receipt'], 'comprobante.pdf', { type: 'application/pdf' }),
};

describe('reportePagoSchema', () => {
  it('accepts a PDF receipt and a valid reference', () => {
    expect(reportePagoSchema.safeParse(validReport).success).toBe(true);
  });

  it('requires a reference of at least six characters', () => {
    expect(reportePagoSchema.safeParse({ ...validReport, reference: '12345' }).success).toBe(false);
  });

  it('rejects unsupported file types', () => {
    const file = new File(['receipt'], 'comprobante.txt', { type: 'text/plain' });
    expect(reportePagoSchema.safeParse({ ...validReport, file }).success).toBe(false);
  });

  it('rejects files larger than five megabytes', () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'comprobante.pdf', {
      type: 'application/pdf',
    });
    expect(reportePagoSchema.safeParse({ ...validReport, file }).success).toBe(false);
  });
});
