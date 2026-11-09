import { describe, expect, it } from 'vitest';
import { getPortalServiceStatus, type PortalInvoice } from './clientePortal';

const invoice = (status: PortalInvoice['status'], dueDate: string): PortalInvoice => ({
  id: 'invoice-1',
  invoiceNumber: 'FCT-2026-11-CLI-1',
  period: '2026-11',
  dueDate,
  total: '50000',
  status,
});

describe('getPortalServiceStatus', () => {
  const today = new Date('2026-11-08T12:00:00.000Z');

  it('marks a suspended or cut service as suspended', () => {
    expect(getPortalServiceStatus('SUSPENDED', [], today)).toBe('SUSPENDIDO');
    expect(getPortalServiceStatus('CUT', [], today)).toBe('SUSPENDIDO');
  });

  it('marks a due or overdue invoice as expiring', () => {
    expect(
      getPortalServiceStatus('ACTIVE', [invoice('PENDING', '2026-11-10T12:00:00.000Z')], today),
    ).toBe('POR_VENCER');
    expect(
      getPortalServiceStatus('ACTIVE', [invoice('OVERDUE', '2026-11-01T12:00:00.000Z')], today),
    ).toBe('POR_VENCER');
  });

  it('marks a healthy service as active', () => {
    expect(getPortalServiceStatus('ACTIVE', [], today)).toBe('ACTIVO');
    expect(
      getPortalServiceStatus('ACTIVE', [invoice('PENDING', '2026-11-20T12:00:00.000Z')], today),
    ).toBe('ACTIVO');
  });
});
