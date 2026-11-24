import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import PDFDocument from 'pdfkit';

export interface ReceiptData {
  receiptNumber: string;
  issuedAt: Date;
  clientName: string;
  clientDocument: string;
  clientCode: string;
  clientEmail: string;
  invoiceNumber: string;
  period: string;
  amount: number;
  paymentMethod: string;
  receivedBy: string;
}

/** apps/api/assets, valid both from src (tests) and dist (runtime). */
const LOGO_PATH = resolve(__dirname, '../../../assets/logo-unitik.png');

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  NEQUI: 'Nequi',
  BANK_TRANSFER: 'Transferencia bancaria',
  DAVIPLATA: 'Daviplata',
  ONLINE_GATEWAY: 'Pasarela en línea',
};

export function formatCop(amount: number): string {
  return `$ ${Math.round(amount).toLocaleString('es-CO')}`;
}

export function receiptNumberFor(paymentId: string, paidAt: Date): string {
  const ymd = paidAt.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }).replace(/-/g, '');
  return `REC-${ymd}-${paymentId.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

/** Renders the cashier receipt as a one-page A5 PDF. */
export function renderReceiptPdf(data: ReceiptData): Promise<Buffer> {
  return new Promise((resolvePdf, reject) => {
    const doc = new PDFDocument({ size: 'A5', margin: 36, info: { Title: data.receiptNumber } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolvePdf(Buffer.concat(chunks)));
    doc.on('error', reject);

    const width = doc.page.width - 72;
    if (existsSync(LOGO_PATH)) doc.image(LOGO_PATH, 36, 28, { width: 70 });
    doc
      .fillColor('#1d4ed8')
      .font('Helvetica-Bold')
      .fontSize(15)
      .text('UNITIK Internet Sin Límite S.A.S.', 116, 40, { width: width - 80 })
      .fillColor('#475569')
      .font('Helvetica')
      .fontSize(9)
      .text('Cumbitara, Nariño · Recibo de pago', 116, 60);

    doc
      .moveTo(36, 110)
      .lineTo(36 + width, 110)
      .strokeColor('#cbd5e1')
      .stroke();
    doc
      .fillColor('#0f172a')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text(`Recibo ${data.receiptNumber}`, 36, 122)
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#475569')
      .text(
        data.issuedAt.toLocaleString('es-CO', {
          timeZone: 'America/Bogota',
          dateStyle: 'long',
          timeStyle: 'short',
        }),
        36,
        140,
      );

    const rows: Array<[string, string]> = [
      ['Cliente', data.clientName],
      ['Documento', data.clientDocument],
      ['Código de cliente', data.clientCode],
      ['Factura', data.invoiceNumber],
      ['Periodo', data.period],
      ['Medio de pago', METHOD_LABELS[data.paymentMethod] ?? data.paymentMethod],
      ['Recibido por', data.receivedBy],
    ];
    let y = 168;
    for (const [label, value] of rows) {
      doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(label, 36, y, { width: 110 });
      doc
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(value, 150, y, { width: width - 114 });
      y += 20;
    }

    doc
      .roundedRect(36, y + 8, width, 44, 6)
      .fillColor('#ecfdf5')
      .fill();
    doc
      .fillColor('#065f46')
      .font('Helvetica')
      .fontSize(9)
      .text('Valor pagado', 48, y + 16)
      .font('Helvetica-Bold')
      .fontSize(16)
      .text(formatCop(data.amount), 48, y + 28, { width: width - 24, align: 'right' });

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#94a3b8')
      .text(
        'Pago validado. La reconexión del servicio, si aplica, se procesa automáticamente. ' +
          'Conserve este recibo como soporte.',
        36,
        y + 68,
        { width },
      );
    doc.end();
  });
}
