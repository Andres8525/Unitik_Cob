import { create } from 'zustand';

export type MetodoPagoDigital = 'NEQUI' | 'BANK_TRANSFER';

export interface ComprobantePagoInput {
  invoiceId: string;
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

interface PagosState {
  reportes: PagoReportado[];
  enviarComprobantePago: (datos: ComprobantePagoInput) => Promise<string>;
}

export const usePagosStore = create<PagosState>((set) => ({
  reportes: [],
  enviarComprobantePago: async (datos) => {
    await new Promise<void>((resolve) => setTimeout(resolve, 400));
    const radicado = `#RAD-${Math.floor(10_000 + Math.random() * 90_000)}`;
    const { file, ...paymentData } = datos;

    set((state) => ({
      reportes: [
        {
          ...paymentData,
          radicado,
          fileName: file.name,
          status: 'PENDING_VALIDATION',
          createdAt: new Date().toISOString(),
        },
        ...state.reportes,
      ],
    }));

    return radicado;
  },
}));
