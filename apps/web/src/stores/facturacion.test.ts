import { beforeEach, describe, expect, it } from 'vitest';
import { useFacturacionStore, type DashboardInvoice } from './facturacion';

const initialInvoices: DashboardInvoice[] = useFacturacionStore
  .getState()
  .facturas.map((invoice) => ({
    ...invoice,
    concepts: invoice.concepts.map((concept) => ({ ...concept })),
  }));

describe('facturacion store', () => {
  beforeEach(() => {
    useFacturacionStore.setState({
      facturas: initialInvoices.map((invoice) => ({
        ...invoice,
        concepts: invoice.concepts.map((concept) => ({ ...concept })),
      })),
    });
  });

  it('updates concepts only for draft and pending invoices', () => {
    const updatedConcepts = [{ id: 'new-concept', description: 'Plan actualizado', amount: 99000 }];

    useFacturacionStore.getState().editarConceptoFactura('invoice-2026-001', updatedConcepts);
    useFacturacionStore.getState().editarConceptoFactura('invoice-2026-002', updatedConcepts);

    const invoices = useFacturacionStore.getState().facturas;
    expect(invoices.find((invoice) => invoice.id === 'invoice-2026-001')?.concepts).toEqual(updatedConcepts);
    expect(invoices.find((invoice) => invoice.id === 'invoice-2026-002')?.concepts).not.toEqual(updatedConcepts);
  });

  it('allows only ADMIN to cancel an issued invoice, retaining it in the list', () => {
    const store = useFacturacionStore.getState();

    expect(store.anularFactura('invoice-2026-002', 'CASHIER')).toBe(false);
    expect(store.anularFactura('invoice-2026-001', 'ADMIN')).toBe(false);
    expect(store.anularFactura('invoice-2026-002', 'ADMIN')).toBe(true);

    const invoices = useFacturacionStore.getState().facturas;
    expect(invoices).toHaveLength(initialInvoices.length);
    expect(invoices.find((invoice) => invoice.id === 'invoice-2026-002')?.status).toBe('CANCELLED');
  });
});
