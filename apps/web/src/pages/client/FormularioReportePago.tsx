import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { CheckCircle2, FileText, Upload, X } from 'lucide-react';
import {
  ACCEPTED_PAYMENT_RECEIPT_TYPES,
  reportePagoSchema,
  type ReportePagoFormValues,
} from '../../schemas/reportePago';
import { usePagosStore } from '../../stores/pagos';
import ImageSourceButtons from '../../components/ImageSourceButtons';
import DatosTransferencia from './DatosTransferencia';

interface InvoiceOption {
  id: string;
  invoiceNumber: string;
  total: string;
}

interface FormularioReportePagoProps {
  invoices: InvoiceOption[];
}

const fieldClassName =
  'mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 focus:border-unitik-500 focus:outline-none focus:ring-2 focus:ring-unitik-100';

const acceptedMimeTypes = ACCEPTED_PAYMENT_RECEIPT_TYPES.join(',');

export default function FormularioReportePago({ invoices }: FormularioReportePagoProps) {
  const enviarComprobantePago = usePagosStore((state) => state.enviarComprobantePago);
  const [radicado, setRadicado] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draggingFile, setDraggingFile] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    resetField,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReportePagoFormValues>({
    resolver: zodResolver(reportePagoSchema),
    defaultValues: { invoiceId: '', paymentMethod: 'NEQUI', reference: '' },
  });
  const receipt = watch('file');
  const selectedMethod = watch('paymentMethod');

  const submit = async (values: ReportePagoFormValues) => {
    setSubmitError(null);
    const invoice = invoices.find((option) => option.id === values.invoiceId);
    if (!invoice) {
      setSubmitError('Selecciona una factura pendiente.');
      return;
    }
    try {
      const newRadicado = await enviarComprobantePago({ ...values, amount: Number(invoice.total) });
      setRadicado(newRadicado);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'No se pudo enviar el reporte. Intenta de nuevo.',
      );
    }
  };

  if (radicado) {
    return (
      <div
        className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
          <div>
            <h3 className="font-bold">¡Envío exitoso!</h3>
            <p className="mt-1 text-sm leading-relaxed">
              El comprobante fue recibido correctamente. Radicado {radicado} generado; el
              administrador lo validará en breve.
            </p>
            <p className="mt-2 text-xs text-emerald-800">
              El pago queda pendiente de validación. Este reporte no reactiva automáticamente el
              servicio.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form className="mt-4 space-y-4" noValidate onSubmit={handleSubmit(submit)}>
      <label className="block text-sm font-medium text-slate-700">
        Factura pagada
        <select {...register('invoiceId')} className={fieldClassName}>
          <option value="">Selecciona una factura</option>
          {invoices.map((invoice) => (
            <option key={invoice.id} value={invoice.id}>
              {invoice.invoiceNumber} · ${Number(invoice.total).toLocaleString('es-CO')}
            </option>
          ))}
        </select>
        {errors.invoiceId && (
          <span className="mt-1 block text-xs text-red-600">{errors.invoiceId.message}</span>
        )}
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Medio de pago
        <Controller
          control={control}
          name="paymentMethod"
          render={({ field }) => (
            <select {...field} className={fieldClassName}>
              <option value="NEQUI">Nequi</option>
              <option value="BANK_TRANSFER">Transferencia bancaria</option>
            </select>
          )}
        />
        {errors.paymentMethod && (
          <span className="mt-1 block text-xs text-red-600">{errors.paymentMethod.message}</span>
        )}
      </label>

      <DatosTransferencia method={selectedMethod} />

      <label className="block text-sm font-medium text-slate-700">
        Número de referencia / Nequi
        <input
          {...register('reference')}
          autoComplete="off"
          className={fieldClassName}
          maxLength={100}
          placeholder="Ej. 123456789"
        />
        {errors.reference && (
          <span className="mt-1 block text-xs text-red-600">{errors.reference.message}</span>
        )}
      </label>

      <Controller
        control={control}
        name="file"
        render={({ field, fieldState }) => (
          <div>
            <span className="block text-sm font-medium text-slate-700">Comprobante de pago</span>
            <div
              className={`mt-1 flex min-h-28 flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-5 text-center transition ${
                draggingFile ? 'border-unitik-600 bg-unitik-50' : 'border-slate-300 bg-slate-50'
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                setDraggingFile(true);
              }}
              onDragLeave={() => setDraggingFile(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDraggingFile(false);
                const file = event.dataTransfer.files[0];
                if (file) field.onChange(file);
              }}
            >
              {receipt ? (
                <span className="flex max-w-full items-center gap-2 text-sm font-medium text-slate-700">
                  <FileText className="h-5 w-5 shrink-0 text-unitik-600" aria-hidden="true" />
                  <span className="truncate">{receipt.name}</span>
                </span>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-unitik-600" aria-hidden="true" />
                  <span className="mt-2 text-sm font-semibold text-slate-800">
                    Toma una foto del comprobante o importa el archivo
                  </span>
                  <span className="mt-1 text-xs text-slate-500">
                    JPG, PNG o PDF · Máximo 5 MB · también puedes arrastrarlo aquí
                  </span>
                </>
              )}
            </div>
            <div className="mt-2">
              <ImageSourceButtons
                onFile={(file) => field.onChange(file)}
                accept={acceptedMimeTypes}
                disabled={isSubmitting}
                cameraTitle="Foto del comprobante"
                importLabel="Importar imagen o PDF"
                importInputRef={field.ref}
                name={field.name}
                onBlur={field.onBlur}
              />
            </div>
            {receipt && (
              <button
                type="button"
                onClick={() => resetField('file')}
                className="mt-2 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-red-700"
              >
                <X className="h-4 w-4" aria-hidden="true" /> Quitar archivo
              </button>
            )}
            {fieldState.error && (
              <span className="mt-1 block text-xs text-red-600">{fieldState.error.message}</span>
            )}
            <p className="mt-1 text-xs text-slate-500">
              El comprobante se envía de forma segura y el equipo de UNITIK lo revisa en Gestión de
              Pagos.
            </p>
          </div>
        )}
      />

      {submitError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {submitError}
        </p>
      )}

      <button
        className="min-h-12 w-full rounded-xl bg-unitik-600 px-4 text-base font-bold text-white transition hover:bg-unitik-700 focus:outline-none focus:ring-4 focus:ring-unitik-100 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? 'Enviando comprobante…' : 'Enviar Comprobante'}
      </button>
    </form>
  );
}
