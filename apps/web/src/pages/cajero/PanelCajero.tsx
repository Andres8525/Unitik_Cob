import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Banknote, CheckCircle2, LoaderCircle, Search, UserRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import DashboardShell, { type DashboardNavItem } from '../../components/DashboardShell';
import {
  useCajeroStore,
  type ClienteCajero,
  type FacturaPendienteCajero,
} from '../../stores/cajero';

const searchSchema = z.object({
  query: z.string().trim().min(1, 'Ingresa nombre, cédula o código de contrato.'),
});

type SearchValues = z.infer<typeof searchSchema>;

const navItems: DashboardNavItem[] = [
  { label: 'Resumen', to: '/cajero/dashboard', icon: <Banknote className="h-4 w-4" /> },
  { label: 'Registrar pago', to: '/cajero/pagos', icon: <Search className="h-4 w-4" /> },
];

const money = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

function FacturaRow({
  invoice,
  busy,
  onPay,
}: {
  invoice: FacturaPendienteCajero;
  busy: boolean;
  onPay: (invoiceId: string) => void;
}) {
  const overdue = invoice.status === 'OVERDUE';
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-semibold text-slate-900">{invoice.invoiceNumber}</h4>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              overdue ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {overdue ? 'Vencida' : invoice.status === 'PROMISE_TO_PAY' ? 'Promesa de pago' : 'Pendiente'}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Periodo {invoice.period} · Vence {new Date(`${invoice.dueDate}T00:00:00`).toLocaleDateString('es-CO')}
        </p>
        <p className="mt-2 text-lg font-bold text-slate-900">{money.format(Number(invoice.total))}</p>
      </div>
      <button
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-11"
        disabled={busy}
        onClick={() => onPay(invoice.id)}
        type="button"
      >
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
        {busy ? 'Registrando…' : 'Registrar Pago (Efectivo)'}
      </button>
    </article>
  );
}

export default function PanelCajero() {
  const clientesEncontrados = useCajeroStore((state) => state.clientesEncontrados);
  const hasSearched = useCajeroStore((state) => state.hasSearched);
  const clienteBuscado = useCajeroStore((state) => state.clienteBuscado);
  const facturasPendientes = useCajeroStore((state) => state.facturasPendientes);
  const isSearching = useCajeroStore((state) => state.isSearching);
  const isLoadingInvoices = useCajeroStore((state) => state.isLoadingInvoices);
  const isRegistering = useCajeroStore((state) => state.isRegistering);
  const registeringInvoiceId = useCajeroStore((state) => state.registeringInvoiceId);
  const error = useCajeroStore((state) => state.error);
  const successMessage = useCajeroStore((state) => state.successMessage);
  const buscarCliente = useCajeroStore((state) => state.buscarCliente);
  const seleccionarCliente = useCajeroStore((state) => state.seleccionarCliente);
  const registrarPagoEfectivo = useCajeroStore((state) => state.registrarPagoEfectivo);
  const {
    register,
    handleSubmit,
    formState: { errors: formErrors },
  } = useForm<SearchValues>({ resolver: zodResolver(searchSchema) });

  const onSearch = (values: SearchValues) => {
    void buscarCliente(values.query);
  };

  const payInvoice = (invoiceId: string) => {
    void registrarPagoEfectivo(invoiceId).catch(() => undefined);
  };

  return (
    <DashboardShell title="Cajero" subtitle="Búsqueda de cliente y recepción de pagos en efectivo" navItems={navItems}>
      <section className="mx-auto w-full max-w-4xl space-y-5">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-unitik-600">Recaudo presencial</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">Buscar cliente</h2>
            <p className="mt-1 text-sm text-slate-500">Busca por nombre, cédula o código de contrato.</p>
          </div>

          <form className="flex flex-col gap-3 sm:flex-row" noValidate onSubmit={handleSubmit(onSearch)}>
            <label className="relative block flex-1">
              <span className="sr-only">Nombre, cédula o código de contrato</span>
              <Search
                aria-hidden="true"
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              />
              <input
                {...register('query')}
                autoComplete="off"
                className="min-h-12 w-full rounded-lg border border-slate-300 py-3 pl-11 pr-3 text-base text-slate-900 outline-none focus:border-unitik-500 focus:ring-2 focus:ring-unitik-100"
                placeholder="Ej. María Pérez, 1085123456 o CLI-1085123456"
              />
            </label>
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-unitik-600 px-6 py-3 text-sm font-semibold text-white hover:bg-unitik-700 disabled:opacity-60"
              disabled={isSearching}
              type="submit"
            >
              {isSearching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {isSearching ? 'Buscando…' : 'Buscar'}
            </button>
          </form>
          {formErrors.query && (
            <p className="mt-2 text-sm text-red-600" role="alert">{formErrors.query.message}</p>
          )}
        </div>

        {error && (
          <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <p>{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status" aria-live="polite">
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
            <p className="font-medium">{successMessage}</p>
          </div>
        )}

        {clientesEncontrados.length > 1 && !clienteBuscado && (
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h3 className="mb-3 font-semibold text-slate-900">Selecciona el cliente correcto</h3>
            <div className="divide-y divide-slate-100">
              {clientesEncontrados.map((client) => (
                <ClientOption key={client.id} client={client} onSelect={seleccionarCliente} />
              ))}
            </div>
          </section>
        )}

        {hasSearched && clientesEncontrados.length === 0 && !clienteBuscado && !isSearching && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm" role="status">
            No encontramos clientes con esos datos. Verifica el nombre, la cédula o el código de contrato.
          </div>
        )}

        {clienteBuscado && (
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-unitik-50 text-unitik-700">
                  <UserRound className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">
                    {clienteBuscado.user.firstName} {clienteBuscado.user.lastName}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    C.C. {clienteBuscado.user.documentId} · Contrato {clienteBuscado.clientCode}
                  </p>
                  <p className="text-sm text-slate-500">{clienteBuscado.address}</p>
                </div>
              </div>
              <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {clienteBuscado.status === 'ACTIVE' ? 'Servicio activo' : clienteBuscado.status}
              </span>
            </div>

            <div className="pt-5">
              <h3 className="mb-4 font-semibold text-slate-900">Facturas pendientes</h3>
              {isLoadingInvoices ? (
                <p className="text-sm text-slate-500">Cargando facturas…</p>
              ) : facturasPendientes.length === 0 ? (
                <p className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
                  Este cliente no tiene facturas pendientes de pago.
                </p>
              ) : (
                <div className="space-y-3">
                  {facturasPendientes.map((invoice) => (
                    <FacturaRow
                      key={invoice.id}
                      invoice={invoice}
                      busy={isRegistering && registeringInvoiceId === invoice.id}
                      onPay={payInvoice}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </section>
    </DashboardShell>
  );
}

function ClientOption({
  client,
  onSelect,
}: {
  client: ClienteCajero;
  onSelect: (client: ClienteCajero) => Promise<void>;
}) {
  return (
    <button
      className="flex w-full flex-col gap-1 py-3 text-left hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
      onClick={() => void onSelect(client)}
      type="button"
    >
      <span className="font-medium text-slate-900">
        {client.user.firstName} {client.user.lastName} · C.C. {client.user.documentId}
      </span>
      <span className="text-sm text-slate-500">Contrato {client.clientCode}</span>
    </button>
  );
}
