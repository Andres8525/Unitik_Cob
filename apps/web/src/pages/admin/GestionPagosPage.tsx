import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, LoaderCircle, RefreshCw, XCircle } from 'lucide-react';
import { useState } from 'react';
import { formatCop } from '@unitik/shared-types';
import { api } from '../../api/http';
import DashboardShell from '../../components/DashboardShell';
import ProofViewer from '../../components/ProofViewer';
import { ADMIN_NAV_ITEMS } from '../../components/navigation';

type ReviewStatus = 'PENDING_VALIDATION' | 'VALIDATED' | 'REJECTED';

interface ReviewPayment {
  id: string;
  amount: string | number;
  paymentMethod: 'NEQUI' | 'BANK_TRANSFER';
  reference: string | null;
  proofUrl: string | null;
  status: ReviewStatus;
  paidAt: string;
  createdAt: string;
  validatedAt: string | null;
  invoice: {
    invoiceNumber: string;
    period: string;
    total: string | number;
    client: {
      clientCode: string;
      user: { firstName: string; lastName: string; documentId: string; email: string };
    };
  };
}

const TABS: Array<{ status: ReviewStatus; label: string }> = [
  { status: 'PENDING_VALIDATION', label: 'Pendientes' },
  { status: 'VALIDATED', label: 'Aprobados' },
  { status: 'REJECTED', label: 'Rechazados' },
];

const METHOD_LABELS = { NEQUI: 'Nequi', BANK_TRANSFER: 'Transferencia bancaria' } as const;

function PaymentCard({ payment }: { payment: ReviewPayment }) {
  const queryClient = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const client = payment.invoice.client;
  const amount = Number(payment.amount);
  const differs = amount !== Number(payment.invoice.total);

  const validate = useMutation({
    mutationFn: (body: { approve: boolean; reason?: string }) =>
      api(`/payments/${encodeURIComponent(payment.id)}/validate`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['payments', 'review'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'kpis'] });
    },
  });

  return (
    <article className="grid gap-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 lg:grid-cols-[16rem_1fr]">
      {payment.proofUrl ? (
        <ProofViewer src={payment.proofUrl} label={`Comprobante de ${client.user.firstName}`} />
      ) : (
        <div className="flex h-48 items-center justify-center rounded-xl bg-amber-50 p-4 text-center text-sm text-amber-800">
          El cliente no adjuntó comprobante. No se puede aprobar sin soporte.
        </div>
      )}

      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {client.user.firstName} {client.user.lastName}
            </h3>
            <p className="text-sm text-slate-500">
              {client.clientCode} · C.C. {client.user.documentId} · {client.user.email}
            </p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCop(amount)}</p>
        </div>

        <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Factura</dt>
            <dd className="font-medium text-slate-900">
              {payment.invoice.invoiceNumber} · periodo {payment.invoice.period}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Medio y referencia</dt>
            <dd className="font-medium text-slate-900">
              {METHOD_LABELS[payment.paymentMethod]} · {payment.reference ?? 'sin referencia'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Reportado</dt>
            <dd className="font-medium text-slate-900">
              {new Date(payment.createdAt).toLocaleString('es-CO', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Valor de la factura</dt>
            <dd className={`font-medium ${differs ? 'text-amber-700' : 'text-slate-900'}`}>
              {formatCop(Number(payment.invoice.total))}
              {differs && ' · no coincide con el valor reportado'}
            </dd>
          </div>
        </dl>

        {payment.status === 'PENDING_VALIDATION' ? (
          <div className="mt-5 border-t border-slate-100 pt-4">
            {validate.isError && (
              <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                {validate.error.message}
              </p>
            )}
            {rejecting ? (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Motivo del rechazo (se notifica al cliente)
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    maxLength={300}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-unitik-500 focus:outline-none focus:ring-2 focus:ring-unitik-100"
                    placeholder="Ej. El comprobante no es legible o el valor no coincide"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={reason.trim().length < 5 || validate.isPending}
                    onClick={() => validate.mutate({ approve: false, reason: reason.trim() })}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" aria-hidden="true" /> Confirmar rechazo
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejecting(false)}
                    className="min-h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!payment.proofUrl || validate.isPending}
                  onClick={() => validate.mutate({ approve: true })}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {validate.isPending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  )}
                  Aprobar y reconectar
                </button>
                <button
                  type="button"
                  disabled={validate.isPending}
                  onClick={() => setRejecting(true)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-700 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4" aria-hidden="true" /> Rechazar
                </button>
              </div>
            )}
          </div>
        ) : (
          <p
            className={`mt-5 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              payment.status === 'VALIDATED'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {payment.status === 'VALIDATED' ? 'Aprobado' : 'Rechazado'}
            {payment.validatedAt &&
              ` · ${new Date(payment.validatedAt).toLocaleString('es-CO', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}`}
          </p>
        )}
      </div>
    </article>
  );
}

/** Admin "Gestión de Pagos": review the Nequi/transfer proofs reported by clients. */
export default function GestionPagosPage() {
  const [status, setStatus] = useState<ReviewStatus>('PENDING_VALIDATION');
  const payments = useQuery({
    queryKey: ['payments', 'review', status],
    queryFn: () => api<ReviewPayment[]>(`/payments?status=${status}`),
    refetchInterval: status === 'PENDING_VALIDATION' ? 60_000 : false,
  });

  return (
    <DashboardShell
      title="Gestión de Pagos"
      subtitle="Revisa los comprobantes de Nequi y transferencia enviados por los clientes."
      navItems={ADMIN_NAV_ITEMS}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Estado de los pagos"
          className="flex gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200"
        >
          {TABS.map((tab) => (
            <button
              key={tab.status}
              type="button"
              role="tab"
              aria-selected={status === tab.status}
              onClick={() => setStatus(tab.status)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                status === tab.status
                  ? 'bg-unitik-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
              {tab.status === status && payments.data ? ` (${payments.data.length})` : ''}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void payments.refetch()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${payments.isFetching ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          Actualizar
        </button>
      </div>

      {payments.isPending && (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Cargando pagos…
        </p>
      )}
      {payments.isError && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          No se pudieron cargar los pagos: {payments.error.message}
        </p>
      )}
      {payments.data?.length === 0 && (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
          {status === 'PENDING_VALIDATION'
            ? 'No hay comprobantes pendientes por revisar.'
            : 'No hay pagos en este estado.'}
        </p>
      )}
      <div className="space-y-4">
        {payments.data?.map((payment) => (
          <PaymentCard key={payment.id} payment={payment} />
        ))}
      </div>
    </DashboardShell>
  );
}
