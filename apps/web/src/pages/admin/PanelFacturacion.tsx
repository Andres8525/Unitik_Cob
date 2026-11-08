import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Download, Plus, X } from 'lucide-react';
import { formatCop } from '@unitik/shared-types';
import type { InvoiceConcept, DashboardInvoice, InvoiceStatus } from '../../stores/facturacion';
import { useFacturacionStore } from '../../stores/facturacion';
import { useAuthStore } from '../../stores/auth';

interface InvoiceFormValues {
  concepts: Array<{ conceptId: string; description: string; amount: number }>;
}

const statusLabels: Record<InvoiceStatus, string> = {
  DRAFT: 'Borrador',
  PENDING: 'Pendiente',
  ISSUED: 'Emitida',
  PAID: 'Pagada',
  CANCELLED: 'Anulada',
};

const statusClasses: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PENDING: 'bg-amber-100 text-amber-800',
  ISSUED: 'bg-sky-100 text-sky-800',
  PAID: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-rose-100 text-rose-800',
};

function totalFor(invoice: DashboardInvoice): number {
  return invoice.concepts.reduce((total, concept) => total + concept.amount, 0);
}

function EditInvoiceModal({
  invoice,
  onSave,
  onClose,
}: {
  invoice: DashboardInvoice;
  onSave: (concepts: InvoiceConcept[]) => void;
  onClose: () => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<InvoiceFormValues>({
    defaultValues: {
      concepts: invoice.concepts.map(({ id, description, amount }) => ({
        conceptId: id,
        description,
        amount,
      })),
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'concepts' });

  const submit = (values: InvoiceFormValues) => {
    onSave(
      values.concepts.map((concept, index) => ({
        id: concept.conceptId || `concept-${Date.now()}-${index}`,
        description: concept.description,
        amount: Number(concept.amount),
      })),
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <section
        aria-labelledby="edit-invoice-title"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        role="dialog"
      >
        <h2 className="text-xl font-bold text-slate-900" id="edit-invoice-title">
          Editar conceptos · {invoice.number}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Ajusta los conceptos de esta factura en estado {statusLabels[invoice.status].toLowerCase()}.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit(submit)}>
          {fields.map((field, index) => (
            <div className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_180px_auto]" key={field.id}>
              <label className="text-xs font-medium text-slate-600">
                Concepto
                <input {...register(`concepts.${index}.conceptId`)} type="hidden" />
                <input
                  {...register(`concepts.${index}.description`, {
                    required: 'El concepto es obligatorio',
                    validate: (value) => value.trim().length > 0 || 'El concepto es obligatorio',
                  })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Descripción del concepto"
                />
                {errors.concepts?.[index]?.description && (
                  <span className="mt-1 block text-xs text-red-600">
                    {errors.concepts[index]?.description?.message}
                  </span>
                )}
              </label>
              <label className="text-xs font-medium text-slate-600">
                Valor (COP)
                <input
                  {...register(`concepts.${index}.amount`, {
                    valueAsNumber: true,
                    required: 'El valor es obligatorio',
                    min: { value: 1, message: 'El valor debe ser positivo' },
                  })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  min="1"
                  type="number"
                />
                {errors.concepts?.[index]?.amount && (
                  <span className="mt-1 block text-xs text-red-600">
                    {errors.concepts[index]?.amount?.message}
                  </span>
                )}
              </label>
              <button
                aria-label={`Quitar concepto ${index + 1}`}
                className="mt-5 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                disabled={fields.length === 1}
                onClick={() => remove(index)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}

          <button
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => append({ conceptId: '', description: '', amount: 1 })}
            type="button"
          >
            <Plus className="h-4 w-4" />
            Agregar concepto
          </button>

          <footer className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="rounded-lg bg-unitik-600 px-4 py-2 text-sm font-semibold text-white hover:bg-unitik-700"
              type="submit"
            >
              Guardar conceptos
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default function PanelFacturacion() {
  const invoices = useFacturacionStore((state) => state.facturas);
  const editarConceptoFactura = useFacturacionStore((state) => state.editarConceptoFactura);
  const anularFactura = useFacturacionStore((state) => state.anularFactura);
  const exportarFacturasMes = useFacturacionStore((state) => state.exportarFacturasMes);
  const currentUser = useAuthStore((state) => state.user);
  const [editingInvoice, setEditingInvoice] = useState<DashboardInvoice | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const isAdmin = currentUser?.role === 'ADMIN';

  const cancelInvoice = (invoice: DashboardInvoice) => {
    setActionMessage('');
    const cancelled = anularFactura(invoice.id, currentUser?.role);
    setActionMessage(
      cancelled
        ? `La factura ${invoice.number} fue anulada.`
        : 'No se pudo anular la factura. Verifica el rol y el estado de la factura.',
    );
  };

  const saveConcepts = (concepts: InvoiceConcept[]) => {
    if (!editingInvoice) return;
    editarConceptoFactura(editingInvoice.id, concepts);
    setEditingInvoice(null);
    setActionMessage(`Se actualizaron los conceptos de ${editingInvoice.number}.`);
  };

  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
        <div>
          <h2 className="font-semibold text-slate-900">Facturación electrónica</h2>
          <p className="mt-1 text-sm text-slate-500">Facturas del mes y estado de emisión</p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-unitik-600 px-4 py-2 text-sm font-semibold text-white hover:bg-unitik-700"
          onClick={exportarFacturasMes}
          type="button"
        >
          <Download className="h-4 w-4" />
          Exportar facturas del mes
        </button>
      </header>

      {actionMessage && (
        <p className="border-b border-slate-100 px-5 py-3 text-sm text-slate-700" role="status">
          {actionMessage}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Factura</th>
              <th className="px-5 py-3 font-semibold">Cliente</th>
              <th className="px-5 py-3 font-semibold">Fecha</th>
              <th className="px-5 py-3 font-semibold">Conceptos</th>
              <th className="px-5 py-3 font-semibold">Total</th>
              <th className="px-5 py-3 font-semibold">Estado</th>
              <th className="px-5 py-3 text-right font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.map((invoice) => {
              const editable = invoice.status === 'DRAFT' || invoice.status === 'PENDING';
              return (
                <tr className="text-slate-700" key={invoice.id}>
                  <td className="px-5 py-4 font-medium text-slate-900">{invoice.number}</td>
                  <td className="px-5 py-4">{invoice.clientName}</td>
                  <td className="px-5 py-4">{new Date(invoice.issueDate).toLocaleDateString('es-CO')}</td>
                  <td className="px-5 py-4">{invoice.concepts.length}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{formatCop(totalFor(invoice))}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[invoice.status]}`}>
                      {statusLabels[invoice.status]}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      {editable && (
                        <button
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          onClick={() => setEditingInvoice(invoice)}
                          type="button"
                        >
                          Editar conceptos
                        </button>
                      )}
                      {invoice.status === 'ISSUED' &&
                        (isAdmin ? (
                          <button
                            className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                            onClick={() => cancelInvoice(invoice)}
                            type="button"
                          >
                            Anular factura
                          </button>
                        ) : (
                          <button
                            className="cursor-not-allowed rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-400"
                            disabled
                            title="Solo un administrador puede anular facturas"
                            type="button"
                          >
                            Anular factura
                          </button>
                        ))}
                    </div>
                  </td>
                </tr>
              );
            })}
            {invoices.length === 0 && (
              <tr>
                <td className="px-5 py-10 text-center text-slate-500" colSpan={7}>
                  No hay facturas para este mes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingInvoice && (
        <EditInvoiceModal
          invoice={editingInvoice}
          onClose={() => setEditingInvoice(null)}
          onSave={saveConcepts}
        />
      )}
    </section>
  );
}
