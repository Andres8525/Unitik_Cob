import { useQuery } from '@tanstack/react-query';
import { Check, Copy, Landmark, Smartphone } from 'lucide-react';
import { useState } from 'react';
import {
  fetchPaymentAccounts,
  PAYMENT_ACCOUNTS_QUERY_KEY,
  type PaymentAccount,
} from '../../api/paymentAccounts';

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(value.replace(/\s/g, '')).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-unitik-700 hover:bg-unitik-100"
      aria-label={`Copiar ${value}`}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  );
}

/** Where the client can pay: collection accounts published by the administrator. */
export default function DatosTransferencia({ method }: { method: PaymentAccount['method'] }) {
  const accounts = useQuery({
    queryKey: PAYMENT_ACCOUNTS_QUERY_KEY,
    queryFn: fetchPaymentAccounts,
    staleTime: 5 * 60_000,
  });

  const visible = (accounts.data ?? []).filter((account) => account.method === method);

  return (
    <section
      aria-label="Datos para realizar el pago"
      className="rounded-xl border border-unitik-100 bg-unitik-50 p-4"
    >
      <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
        {method === 'NEQUI' ? (
          <Smartphone className="h-4 w-4 text-unitik-700" aria-hidden="true" />
        ) : (
          <Landmark className="h-4 w-4 text-unitik-700" aria-hidden="true" />
        )}
        {method === 'NEQUI' ? 'Paga por Nequi a' : 'Transfiere a'}
      </h4>

      {accounts.isPending && <p className="mt-2 text-sm text-slate-500">Cargando datos de pago…</p>}
      {accounts.isError && (
        <p className="mt-2 text-sm text-red-700">No se pudieron cargar los datos de pago.</p>
      )}
      {accounts.isSuccess && visible.length === 0 && (
        <p className="mt-2 text-sm text-slate-600">
          UNITIK aún no ha publicado cuentas para este medio. Comunícate con la oficina antes de
          pagar.
        </p>
      )}

      <ul className="mt-3 space-y-3">
        {visible.map((account) => (
          <li
            key={`${account.bank}-${account.accountNumber}`}
            className="rounded-lg bg-white p-3 text-sm ring-1 ring-unitik-100"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">
                  {account.bank}
                  {account.accountType &&
                    ` · Cuenta de ${account.accountType === 'AHORROS' ? 'ahorros' : 'corriente'}`}
                </p>
                <p className="mt-1 font-mono text-base font-bold tracking-wide text-unitik-700">
                  {account.accountNumber}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Titular: {account.holderName}
                  {account.holderDocument ? ` · ${account.holderDocument}` : ''}
                </p>
              </div>
              <CopyButton value={account.accountNumber} />
            </div>
            {account.instructions && (
              <p className="mt-2 text-xs text-slate-500">{account.instructions}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
