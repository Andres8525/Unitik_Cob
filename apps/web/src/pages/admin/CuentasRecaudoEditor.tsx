import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Landmark, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../api/http';
import {
  fetchPaymentAccounts,
  PAYMENT_ACCOUNTS_QUERY_KEY,
  type PaymentAccount,
} from '../../api/paymentAccounts';

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-unitik-500 focus:outline-none focus:ring-2 focus:ring-unitik-100';

const emptyAccount = (): PaymentAccount => ({
  method: 'BANK_TRANSFER',
  bank: '',
  accountType: 'AHORROS',
  accountNumber: '',
  holderName: '',
  holderDocument: '',
  instructions: '',
});

/** Returns the first problem of an account, mirroring the API validation. */
function accountProblem(account: PaymentAccount): string | null {
  if (!account.bank.trim()) return 'Indica el banco o la billetera';
  if (!/^[0-9 -]{6,30}$/.test(account.accountNumber.trim())) {
    return 'El número de cuenta debe tener 6 a 30 dígitos (se permiten espacios y guiones)';
  }
  if (!account.holderName.trim()) return 'Indica el titular de la cuenta';
  return null;
}

function cleanAccount(account: PaymentAccount): PaymentAccount {
  const clean: PaymentAccount = {
    method: account.method,
    bank: account.bank.trim(),
    accountNumber: account.accountNumber.trim(),
    holderName: account.holderName.trim(),
  };
  if (account.method === 'BANK_TRANSFER' && account.accountType)
    clean.accountType = account.accountType;
  if (account.holderDocument?.trim()) clean.holderDocument = account.holderDocument.trim();
  if (account.instructions?.trim()) clean.instructions = account.instructions.trim();
  return clean;
}

/** Admin editor for the collection accounts shown to clients when they report a payment. */
export default function CuentasRecaudoEditor() {
  const queryClient = useQueryClient();
  const accounts = useQuery({
    queryKey: PAYMENT_ACCOUNTS_QUERY_KEY,
    queryFn: fetchPaymentAccounts,
  });
  const [draft, setDraft] = useState<PaymentAccount[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (accounts.data) setDraft(accounts.data.map((account) => ({ ...account })));
  }, [accounts.data]);

  const save = useMutation({
    mutationFn: (payload: PaymentAccount[]) =>
      api<PaymentAccount[]>('/payments/accounts', {
        method: 'PUT',
        body: JSON.stringify({ accounts: payload }),
      }),
    onSuccess: (saved) => {
      queryClient.setQueryData(PAYMENT_ACCOUNTS_QUERY_KEY, saved);
      setMessage('Cuentas de recaudo actualizadas. Los clientes ya ven los nuevos datos.');
    },
  });

  const update = (index: number, patch: Partial<PaymentAccount>) =>
    setDraft((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const problems = draft.map(accountProblem);
  const firstProblem = problems.findIndex(Boolean);

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-unitik-50 text-unitik-700">
            <Landmark className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-bold text-slate-900">Cuentas de recaudo</h3>
            <p className="text-sm text-slate-500">
              Datos de Nequi y transferencia que ve el cliente al enviar su comprobante.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDraft((current) => [...current, emptyAccount()])}
          disabled={draft.length >= 6}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Agregar cuenta
        </button>
      </header>

      {accounts.isPending && <p className="mt-4 text-sm text-slate-500">Cargando cuentas…</p>}
      {draft.length === 0 && accounts.isSuccess && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          No hay cuentas publicadas: los clientes no verán a dónde transferir.
        </p>
      )}

      <div className="mt-4 space-y-4">
        {draft.map((account, index) => (
          <fieldset key={index} className="rounded-xl border border-slate-200 p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Cuenta {index + 1}
            </legend>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm font-medium text-slate-700">
                Medio
                <select
                  value={account.method}
                  onChange={(event) =>
                    update(index, { method: event.target.value as PaymentAccount['method'] })
                  }
                  className={inputClass}
                >
                  <option value="BANK_TRANSFER">Transferencia bancaria</option>
                  <option value="NEQUI">Nequi</option>
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Banco o billetera
                <input
                  value={account.bank}
                  onChange={(event) => update(index, { bank: event.target.value })}
                  maxLength={60}
                  className={inputClass}
                  placeholder={account.method === 'NEQUI' ? 'Nequi' : 'Bancolombia'}
                />
              </label>
              {account.method === 'BANK_TRANSFER' && (
                <label className="text-sm font-medium text-slate-700">
                  Tipo de cuenta
                  <select
                    value={account.accountType ?? 'AHORROS'}
                    onChange={(event) =>
                      update(index, {
                        accountType: event.target.value as PaymentAccount['accountType'],
                      })
                    }
                    className={inputClass}
                  >
                    <option value="AHORROS">Ahorros</option>
                    <option value="CORRIENTE">Corriente</option>
                  </select>
                </label>
              )}
              <label className="text-sm font-medium text-slate-700">
                {account.method === 'NEQUI' ? 'Celular Nequi' : 'Número de cuenta'}
                <input
                  value={account.accountNumber}
                  onChange={(event) => update(index, { accountNumber: event.target.value })}
                  inputMode="numeric"
                  maxLength={30}
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Titular
                <input
                  value={account.holderName}
                  onChange={(event) => update(index, { holderName: event.target.value })}
                  maxLength={100}
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                NIT o documento (opcional)
                <input
                  value={account.holderDocument ?? ''}
                  onChange={(event) => update(index, { holderDocument: event.target.value })}
                  maxLength={40}
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2 lg:col-span-3">
                Instrucciones para el cliente (opcional)
                <input
                  value={account.instructions ?? ''}
                  onChange={(event) => update(index, { instructions: event.target.value })}
                  maxLength={200}
                  className={inputClass}
                  placeholder="Ej. Usa tu código de cliente como referencia"
                />
              </label>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-red-600">{problems[index] ?? ''}</span>
              <button
                type="button"
                onClick={() => setDraft((current) => current.filter((_, i) => i !== index))}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Quitar
              </button>
            </div>
          </fieldset>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          disabled={firstProblem !== -1 || save.isPending || !accounts.isSuccess}
          onClick={() => {
            setMessage(null);
            save.mutate(draft.map(cleanAccount));
          }}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-unitik-600 px-4 text-sm font-semibold text-white hover:bg-unitik-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {save.isPending ? 'Guardando…' : 'Guardar cuentas'}
        </button>
        <span className="text-sm" aria-live="polite">
          {save.isError && <span className="text-red-700">{save.error.message}</span>}
          {message && <span className="text-emerald-700">{message}</span>}
        </span>
      </div>
    </section>
  );
}
