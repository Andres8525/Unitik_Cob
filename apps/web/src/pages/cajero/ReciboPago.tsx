import { Printer, X } from 'lucide-react';
import { formatCop } from '@unitik/shared-types';
import BrandLogo from '../../components/BrandLogo';
import type { ReciboEfectivo } from '../../stores/cajero';
import { receiptNumberFor } from './receiptNumber';

interface ReciboPagoProps {
  recibo: ReciboEfectivo;
  cashierName: string;
  onClose: () => void;
  /** Extra actions (download, email) rendered next to the print button. */
  actions?: React.ReactNode;
}

export default function ReciboPago({ recibo, cashierName, onClose, actions }: ReciboPagoProps) {
  const number = receiptNumberFor(recibo.paymentId, recibo.paidAt);
  const rows: Array<[string, string]> = [
    ['Cliente', recibo.clientName],
    ['Documento', recibo.clientDocument],
    ['Código de cliente', recibo.clientCode],
    ['Factura', recibo.invoiceNumber],
    ['Periodo', recibo.period],
    ['Medio de pago', 'Efectivo'],
    ['Recibido por', cashierName],
  ];

  return (
    <section
      aria-label={`Recibo ${number}`}
      className="print-area rounded-2xl bg-white p-6 shadow-sm ring-1 ring-emerald-200 sm:p-8"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <BrandLogo className="h-16 w-auto" alt="UNITIK Internet Sin Límite" />
          <div>
            <p className="text-lg font-bold text-unitik-700">UNITIK Internet Sin Límite S.A.S.</p>
            <p className="text-xs text-slate-500">Cumbitara, Nariño · Recibo de pago</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="no-print rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Cerrar recibo"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-6 border-t border-slate-200 pt-5">
        <h3 className="text-lg font-bold text-slate-900">Recibo {number}</h3>
        <p className="text-sm text-slate-500">
          {new Date(recibo.paidAt).toLocaleString('es-CO', {
            timeZone: 'America/Bogota',
            dateStyle: 'long',
            timeStyle: 'short',
          })}
        </p>
        <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-slate-500">{label}</dt>
              <dd className="font-semibold text-slate-900">{value || '—'}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 text-emerald-900">
          <span className="text-sm">Valor pagado</span>
          <span className="text-2xl font-bold">{formatCop(recibo.amount)}</span>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Pago validado. La reconexión del servicio, si aplica, se procesa automáticamente.
        </p>
      </div>

      <div className="no-print mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          Imprimir recibo
        </button>
        {actions}
      </div>
    </section>
  );
}
