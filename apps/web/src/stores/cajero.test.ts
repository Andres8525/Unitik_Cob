import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/http';
import { useCajeroStore } from './cajero';

vi.mock('../api/http', () => ({ api: vi.fn() }));

describe('useCajeroStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCajeroStore.getState().limpiarBusqueda();
  });

  it('searches by name, ID, or contract code and loads a unique client invoices', async () => {
    const client = {
      id: 'client-1',
      clientCode: 'CLI-123',
      address: 'Cumbitara',
      status: 'ACTIVE',
      user: { documentId: '12345678', firstName: 'Ana', lastName: 'Paz' },
    };
    vi.mocked(api)
      .mockResolvedValueOnce([client])
      .mockResolvedValueOnce([
        { id: 'invoice-1', invoiceNumber: 'F-1', period: '2026-11', dueDate: '2026-11-10', total: '65000', status: 'PENDING' },
        { id: 'invoice-2', invoiceNumber: 'F-2', period: '2026-10', dueDate: '2026-10-10', total: '65000', status: 'PAID' },
      ]);

    await useCajeroStore.getState().buscarCliente('CLI-123');

    expect(api).toHaveBeenNthCalledWith(1, '/clients?search=CLI-123');
    expect(api).toHaveBeenNthCalledWith(2, '/invoices?clientId=client-1');
    expect(useCajeroStore.getState().clienteBuscado).toEqual(client);
    expect(useCajeroStore.getState().facturasPendientes.map((invoice) => invoice.id)).toEqual([
      'invoice-1',
    ]);
  });

  it('registers payment only through the cash endpoint and removes the paid invoice', async () => {
    useCajeroStore.setState({
      facturasPendientes: [
        { id: 'invoice-1', invoiceNumber: 'F-1', period: '2026-11', dueDate: '2026-11-10', total: 65000, status: 'PENDING' },
      ],
    });
    vi.mocked(api).mockResolvedValueOnce({
      id: 'payment-1',
      invoiceId: 'invoice-1',
      amount: 65000,
      paymentMethod: 'CASH',
      status: 'VALIDATED',
    });

    await useCajeroStore.getState().registrarPagoEfectivo('invoice-1');

    expect(api).toHaveBeenCalledWith('/payments/cash', {
      method: 'POST',
      body: JSON.stringify({ invoiceId: 'invoice-1' }),
    });
    expect(useCajeroStore.getState().facturasPendientes).toHaveLength(0);
    expect(useCajeroStore.getState().successMessage).toContain(
      'Pago registrado. Reconexión del servicio en proceso.',
    );
  });
});
