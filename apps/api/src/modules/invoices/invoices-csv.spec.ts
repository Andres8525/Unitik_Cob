import { csvCell, invoicesToCsv } from './invoices-csv';

describe('invoices CSV export (HU-05)', () => {
  const row = {
    invoiceNumber: 'FCT-2026-011',
    clientCode: 'CLI-1085123456',
    clientName: 'Laura López',
    documentId: '1085123456',
    period: '2026-11',
    issueDate: new Date('2026-11-01T06:00:00Z'),
    dueDate: new Date('2026-11-10T06:00:00Z'),
    subtotal: 50000,
    interest: 0,
    discount: 5000,
    total: 45000,
    status: 'PENDING',
    electronicInvoiceCufe: null,
  };

  it('writes a header and one line per invoice with Bogotá dates', () => {
    const csv = invoicesToCsv([row]);
    const [header, line] = csv.replace('﻿', '').trim().split('\r\n');
    expect(header.startsWith('Factura,Código cliente,Cliente')).toBe(true);
    expect(line).toBe(
      'FCT-2026-011,CLI-1085123456,Laura López,1085123456,2026-11,2026-11-01,2026-11-10,50000,0,5000,45000,PENDING,',
    );
  });

  it('quotes separators and neutralises formulas', () => {
    expect(csvCell('López, Laura')).toBe('"López, Laura"');
    expect(csvCell('Dice "hola"')).toBe('"Dice ""hola"""');
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell(-5000)).toBe('-5000');
  });
});
