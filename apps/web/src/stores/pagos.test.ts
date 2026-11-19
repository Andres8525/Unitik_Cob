import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => vi.fn());
vi.mock('../api/http', () => ({ api: apiMock }));

import { radicadoFromPaymentId, usePagosStore } from './pagos';

describe('usePagosStore', () => {
  beforeEach(() => {
    apiMock.mockReset();
    usePagosStore.setState({ reportes: [] });
  });

  it('registers the payment in the API and keeps the receipt pending validation', async () => {
    apiMock.mockResolvedValueOnce({
      id: '3f2a9c10-7b1e-4d2a-9c3e-1a2b3c4d5e6f',
      status: 'PENDING_VALIDATION',
    });

    const radicado = await usePagosStore.getState().enviarComprobantePago({
      invoiceId: 'invoice-1',
      amount: 100000,
      paymentMethod: 'NEQUI',
      reference: 'NQ123456',
      file: new File(['receipt'], 'comprobante.pdf', { type: 'application/pdf' }),
    });

    expect(apiMock).toHaveBeenCalledWith('/payments', {
      method: 'POST',
      body: JSON.stringify({
        invoiceId: 'invoice-1',
        amount: 100000,
        paymentMethod: 'NEQUI',
        reference: 'NQ123456',
      }),
    });
    expect(radicado).toBe('#RAD-3F2A9C10');
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

  it('does not record a report when the API rejects it', async () => {
    apiMock.mockRejectedValueOnce(new Error('La factura ya está pagada'));

    await expect(
      usePagosStore.getState().enviarComprobantePago({
        invoiceId: 'invoice-1',
        amount: 100000,
        paymentMethod: 'BANK_TRANSFER',
        reference: 'TR-1',
        file: new File(['receipt'], 'comprobante.jpg', { type: 'image/jpeg' }),
      }),
    ).rejects.toThrow('La factura ya está pagada');
    expect(usePagosStore.getState().reportes).toEqual([]);
  });

  it('derives a short radicado from the payment id', () => {
    expect(radicadoFromPaymentId('demo-payment-abc')).toBe('#RAD-DEMOPAYM');
  });
});
