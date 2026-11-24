import { Download, LoaderCircle, Mail, MailCheck, MailWarning } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { isDemoMode } from '../../api/demo';
import { downloadFromApi } from '../../api/files';
import { api } from '../../api/http';

interface ReceiptEmailResult {
  receiptNumber: string;
  sentTo: string;
  delivered: boolean;
  message: string;
}

interface ReciboAccionesProps {
  paymentId: string;
  receiptNumber: string;
  clientEmail: string | null;
}

type EmailState =
  | { status: 'idle' | 'sending' }
  | { status: 'done'; result: ReceiptEmailResult }
  | { status: 'error'; message: string };

/**
 * Download and email actions of the cashier receipt. The receipt is
 * emailed automatically once per payment; the cashier can resend it.
 */
export default function ReciboAcciones({
  paymentId,
  receiptNumber,
  clientEmail,
}: ReciboAccionesProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [email, setEmail] = useState<EmailState>({ status: 'idle' });
  const autoSent = useRef<string | null>(null);

  const sendEmail = async () => {
    setEmail({ status: 'sending' });
    try {
      const result = await api<ReceiptEmailResult>(
        `/cashier/receipts/${encodeURIComponent(paymentId)}/email`,
        { method: 'POST' },
      );
      setEmail({ status: 'done', result });
    } catch (error) {
      setEmail({
        status: 'error',
        message: error instanceof Error ? error.message : 'No se pudo enviar el recibo.',
      });
    }
  };

  useEffect(() => {
    if (!clientEmail || autoSent.current === paymentId) return;
    autoSent.current = paymentId;
    void sendEmail();
    // sendEmail only depends on paymentId, already tracked here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, clientEmail]);

  const download = async () => {
    setDownloadError(null);
    if (isDemoMode()) {
      // The demo has no PDF service: the browser print dialog can save the receipt as PDF.
      window.print();
      return;
    }
    setDownloading(true);
    try {
      await downloadFromApi(
        `/cashier/receipts/${encodeURIComponent(paymentId)}/pdf`,
        `${receiptNumber}.pdf`,
      );
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'No se pudo descargar el recibo.');
    } finally {
      setDownloading(false);
    }
  };

  const delivered = email.status === 'done' && email.result.delivered;

  return (
    <>
      <button
        type="button"
        onClick={() => void download()}
        disabled={downloading}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        {downloading ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="h-4 w-4" aria-hidden="true" />
        )}
        Descargar PDF
      </button>

      <button
        type="button"
        onClick={() => void sendEmail()}
        disabled={!clientEmail || email.status === 'sending'}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-unitik-200 bg-white px-4 text-sm font-semibold text-unitik-700 hover:bg-unitik-50 disabled:opacity-60"
      >
        {email.status === 'sending' ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Mail className="h-4 w-4" aria-hidden="true" />
        )}
        {email.status === 'idle' ? 'Enviar al correo' : 'Reenviar al correo'}
      </button>

      <div className="basis-full text-sm" aria-live="polite">
        {!clientEmail && (
          <p className="flex items-center gap-2 text-amber-700">
            <MailWarning className="h-4 w-4" aria-hidden="true" />
            El cliente no tiene correo registrado; entrega el recibo impreso.
          </p>
        )}
        {email.status === 'sending' && (
          <p className="text-slate-500">Enviando el recibo a {clientEmail}…</p>
        )}
        {email.status === 'done' && (
          <p
            className={`flex items-center gap-2 ${delivered ? 'text-emerald-700' : 'text-amber-700'}`}
          >
            {delivered ? (
              <MailCheck className="h-4 w-4" aria-hidden="true" />
            ) : (
              <MailWarning className="h-4 w-4" aria-hidden="true" />
            )}
            {email.result.message}
          </p>
        )}
        {email.status === 'error' && <p className="text-red-700">{email.message}</p>}
        {downloadError && <p className="text-red-700">{downloadError}</p>}
        {isDemoMode() && (
          <p className="mt-1 text-xs text-slate-500">
            Demo: “Descargar PDF” abre la impresión; elige “Guardar como PDF”.
          </p>
        )}
      </div>
    </>
  );
}
