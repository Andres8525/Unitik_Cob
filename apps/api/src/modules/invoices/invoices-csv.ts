/** Row shape exported by GET /invoices/export (HU-05 bulk export). */
export interface InvoiceCsvRow {
  invoiceNumber: string;
  clientCode: string;
  clientName: string;
  documentId: string;
  period: string;
  issueDate: Date;
  dueDate: Date;
  subtotal: number;
  interest: number;
  discount: number;
  total: number;
  status: string;
  electronicInvoiceCufe: string | null;
}

const HEADER = [
  'Factura',
  'Código cliente',
  'Cliente',
  'Documento',
  'Período',
  'Emisión',
  'Vencimiento',
  'Subtotal',
  'Interés',
  'Descuento',
  'Total',
  'Estado',
  'CUFE',
];

/** Quotes a value and neutralises spreadsheet formulas (CSV injection). */
export function csvCell(value: string | number | null): string {
  if (value === null) return '';
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text) && typeof value !== 'number') text = `'${text}`;
  return /[",;\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const day = (date: Date) => date.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

/** UTF-8 CSV with BOM so Excel opens accents correctly. */
export function invoicesToCsv(rows: InvoiceCsvRow[]): string {
  const lines = rows.map((row) =>
    [
      row.invoiceNumber,
      row.clientCode,
      row.clientName,
      row.documentId,
      row.period,
      day(row.issueDate),
      day(row.dueDate),
      row.subtotal,
      row.interest,
      row.discount,
      row.total,
      row.status,
      row.electronicInvoiceCufe,
    ]
      .map(csvCell)
      .join(','),
  );
  return `﻿${[HEADER.join(','), ...lines].join('\r\n')}\r\n`;
}
