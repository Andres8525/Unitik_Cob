import { create } from 'zustand';
import { uploadFile } from '../api/files';
import { api } from '../api/http';

export type MetodoPagoDigital = 'NEQUI' | 'BANK_TRANSFER';

export interface ComprobantePagoInput {
  invoiceId: string;
  /** Invoice total in COP: the backend requires the paid amount (RegisterPaymentDto). */
  amount: number;
  paymentMethod: MetodoPagoDigital;
  reference: string;
  file: File;
}

export interface PagoReportado extends Omit<ComprobantePagoInput, 'file'> {
  radicado: string;
  fileName: string;
  status: 'PENDING_VALIDATION';
  createdAt: string;
}

/** Subset of the Payment record returned by POST /api/payments. */
interface RegisteredPayment {
  id: string;
  status: string;
  createdAt?: string;
}

interface PagosState {
  reportes: PagoReportado[];
  enviarComprobantePago: (datos: ComprobantePagoInput) => Promise<string>;
}

export function radicadoFromPaymentId(paymentId: string): string {
  return `#RAD-${paymentId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

export const usePagosStore = create<PagosState>((set) => ({
  reportes: [],
  enviarComprobantePago: async (datos) => {
    const { file, ...paymentData } = datos;
    // The proof is stored first; the payment references it so the administrator can review it.
    const proof = await uploadFile(file, 'PAYMENT_PROOF');
    const payment = await api<RegisteredPayment>('/payments', {
      method: 'POST',
      body: JSON.stringify({
        invoiceId: paymentData.invoiceId,
        amount: Math.round(paymentData.amount),
        paymentMethod: paymentData.paymentMethod,
        reference: paymentData.reference,
        proofFileId: proof.id,
      }),
    });
    const radicado = radicadoFromPaymentId(payment.id);

    set((state) => ({
      reportes: [
        {
          ...paymentData,
          radicado,
          fileName: file.name,
          status: 'PENDING_VALIDATION',
          createdAt: payment.createdAt ?? new Date().toISOString(),
        },
        ...state.reportes,
      ],
    }));

    return radicado;
  },
}));
