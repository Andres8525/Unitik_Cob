import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePagosStore } from './pagos';

describe('usePagosStore', () => {
  beforeEach(() => {
    usePagosStore.setState({ reportes: [] });
    vi.useRealTimers();
  });

  it('creates a radicado and keeps the receipt pending validation', async () => {
    vi.useFakeTimers();
    const submission = usePagosStore.getState().enviarComprobantePago({
      invoiceId: 'invoice-1',
      paymentMethod: 'NEQUI',
      reference: 'NQ123456',
      file: new File(['receipt'], 'comprobante.pdf', { type: 'application/pdf' }),
    });

    await vi.advanceTimersByTimeAsync(400);
    const radicado = await submission;

    expect(radicado).toMatch(/^#RAD-\d{5}$/);
    expect(usePagosStore.getState().reportes).toEqual([
      expect.objectContaining({
        invoiceId: 'invoice-1',
        paymentMethod: 'NEQUI',
        reference: 'NQ123456',
        fileName: 'comprobante.pdf',
        radicado,
        status: 'PENDING_VALIDATION',
      }),
    ]);
  });
});
