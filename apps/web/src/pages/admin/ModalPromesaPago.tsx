import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '../../api/http';
import { usePoliticasStore } from '../../stores/politicas';

interface ClientResult {
  id: string;
  clientCode: string;
  user: { firstName: string; lastName: string; documentId: string };
}

interface ClientInvoice {
  id: string;
  invoiceNumber: string;
  dueDate: string;
  status: string;
}

interface ModalPromesaPagoProps {
  onClose: () => void;
}

export default function ModalPromesaPago({ onClose }: ModalPromesaPagoProps) {
  const [search, setSearch] = useState('');
  const [client, setClient] = useState<ClientResult | null>(null);
  const [invoiceId, setInvoiceId] = useState('');
  const [days, setDays] = useState<7 | 15>(7);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const registrarPromesa = usePoliticasStore((state) => state.registrarPromesa);

  const clients = useQuery({
    queryKey: ['promise-clients', search],
    queryFn: () => api<ClientResult[]>(`/clients?search=${encodeURIComponent(search)}`),
    enabled: search.trim().length >= 2 && !client,
  });
  const invoices = useQuery({
    queryKey: ['promise-invoices', client?.id],
    queryFn: () => api<ClientInvoice[]>(`/invoices?clientId=${encodeURIComponent(client!.id)}`),
    enabled: !!client,
  });
  const eligibleInvoices =
    invoices.data?.filter((invoice) => ['PENDING', 'OVERDUE'].includes(invoice.status)) ?? [];

  const save = async () => {
    if (!invoiceId) {
      setError('Selecciona una factura pendiente o vencida.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await registrarPromesa(invoiceId, days);
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof ApiError
          ? saveError.message
          : 'No fue posible registrar la promesa. Intenta nuevamente.',
      );
    } finally {
      setSaving(false);
    }
  };

  const inputClassName =
    'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-unitik-500 focus:outline-none focus:ring-2 focus:ring-unitik-100';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <section
        aria-labelledby="promise-modal-title"
        aria-modal="true"
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        role="dialog"
      >
        <h2 className="text-xl font-bold text-slate-900" id="promise-modal-title">
          Registrar promesa de pago
        </h2>
        <p className="mb-5 mt-1 text-sm text-slate-500">
          La promesa vigente protege la factura frente al corte automático.
        </p>

        {!client ? (
          <>
            <label className="block text-sm font-medium text-slate-700">
              Buscar cliente por nombre o documento
              <input
                className={inputClassName}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Escribe al menos 2 caracteres"
                value={search}
              />
            </label>
            {clients.isLoading && <p className="mt-2 text-sm text-slate-500">Buscando clientes…</p>}
            {clients.isError && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                No fue posible buscar clientes. Verifica tu conexión e inténtalo de nuevo.
              </p>
            )}
            {clients.data && (
              <ul className="mt-3 max-h-40 divide-y overflow-y-auto rounded-lg border border-slate-200">
                {clients.data.map((result) => (
                  <li key={result.id}>
                    <button
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                      onClick={() => {
                        setClient(result);
                        setInvoiceId('');
                      }}
                      type="button"
                    >
                      <span className="font-medium text-slate-900">
                        {result.user.firstName} {result.user.lastName}
                      </span>
                      <span className="ml-2 text-slate-500">
                        {result.user.documentId} · {result.clientCode}
                      </span>
                    </button>
                  </li>
                ))}
                {clients.data.length === 0 && (
                  <li className="px-3 py-2 text-sm text-slate-500">No se encontraron clientes.</li>
                )}
              </ul>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
              <div>
                <p className="text-xs text-slate-500">Cliente seleccionado</p>
                <p className="text-sm font-semibold text-slate-900">
                  {client.user.firstName} {client.user.lastName} · {client.clientCode}
                </p>
              </div>
              <button
                className="text-xs font-semibold text-unitik-700 hover:underline"
                onClick={() => {
                  setClient(null);
                  setInvoiceId('');
                }}
                type="button"
              >
                Cambiar
              </button>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Factura pendiente o vencida
              <select
                className={inputClassName}
                onChange={(event) => setInvoiceId(event.target.value)}
                value={invoiceId}
              >
                <option value="">Selecciona una factura</option>
                {eligibleInvoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoiceNumber} — {invoice.status === 'OVERDUE' ? 'Vencida' : 'Pendiente'} — vence{' '}
                    {new Date(invoice.dueDate).toLocaleDateString('es-CO')}
                  </option>
                ))}
              </select>
            </label>
            {invoices.isLoading && <p className="text-xs text-slate-500">Cargando facturas…</p>}
            {invoices.isError && (
              <p className="text-sm text-red-600" role="alert">
                No fue posible consultar las facturas del cliente.
              </p>
            )}
            {invoices.data && eligibleInvoices.length === 0 && (
              <p className="text-sm text-amber-700">Este cliente no tiene facturas elegibles para una promesa.</p>
            )}

            <label className="block text-sm font-medium text-slate-700">
              Plazo adicional
              <select
                className={inputClassName}
                onChange={(event) => setDays(Number(event.target.value) as 7 | 15)}
                value={days}
              >
                <option value={7}>7 días</option>
                <option value={15}>15 días</option>
              </select>
            </label>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}

        <footer className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="rounded-lg bg-unitik-600 px-4 py-2 text-sm font-semibold text-white hover:bg-unitik-700 disabled:opacity-50"
            disabled={!client || !invoiceId || saving || invoices.isLoading}
            onClick={() => void save()}
            type="button"
          >
            {saving ? 'Guardando…' : 'Guardar promesa'}
          </button>
        </footer>
      </section>
    </div>
  );
}
