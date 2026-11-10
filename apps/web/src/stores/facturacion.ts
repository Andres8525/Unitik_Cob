import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { demoStorage } from './demoStorage';

export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'ISSUED' | 'PAID' | 'CANCELLED';

export interface InvoiceConcept {
  id: string;
  description: string;
  amount: number;
}

export interface DashboardInvoice {
  id: string;
  number: string;
  clientName: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  concepts: InvoiceConcept[];
}

interface BillingMetrics {
  activeClients: number;
  suspendedClients: number;
  collectedToday: number;
  overduePortfolio: number;
}

interface FacturacionState {
  metrics: BillingMetrics;
  facturas: DashboardInvoice[];
  editarConceptoFactura: (id: string, concepts: InvoiceConcept[]) => void;
  anularFactura: (id: string, role: string | undefined) => boolean;
  exportarFacturasMes: () => void;
}

const initialInvoices: DashboardInvoice[] = [
  {
    id: 'invoice-2026-001',
    number: 'FCT-2026-11-001',
    clientName: 'María Fernanda López',
    issueDate: '2026-11-02',
    dueDate: '2026-11-15',
    status: 'PENDING',
    concepts: [
      { id: 'concept-001', description: 'Plan Fibra Óptica 100 Mbps', amount: 100000 },
      { id: 'concept-002', description: 'Servicio de instalación', amount: 50000 },
    ],
  },
  {
    id: 'invoice-2026-002',
    number: 'FCT-2026-11-002',
    clientName: 'Carlos Andrés Rosero',
    issueDate: '2026-11-03',
    dueDate: '2026-11-16',
    status: 'ISSUED',
    concepts: [{ id: 'concept-003', description: 'Plan Radio Enlace 15 Mbps', amount: 60000 }],
  },
  {
    id: 'invoice-2026-003',
    number: 'BOR-2026-11-003',
    clientName: 'Diana Patricia Muñoz',
    issueDate: '2026-11-08',
    dueDate: '2026-11-20',
    status: 'DRAFT',
    concepts: [{ id: 'concept-004', description: 'Plan Fibra Óptica 50 Mbps', amount: 85000 }],
  },
  {
    id: 'invoice-2026-004',
    number: 'FCT-2026-11-004',
    clientName: 'Jorge Enrique Díaz',
    issueDate: '2026-11-01',
    dueDate: '2026-11-10',
    status: 'PAID',
    concepts: [{ id: 'concept-005', description: 'Plan Fibra Óptica 30 Mbps', amount: 60000 }],
  },
];

function invoiceTotal(invoice: DashboardInvoice): number {
  return invoice.concepts.reduce((total, concept) => total + concept.amount, 0);
}

function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export const useFacturacionStore = create<FacturacionState>()(
  persist(
    (set, get) => ({
      metrics: {
        activeClients: 1284,
        suspendedClients: 37,
        collectedToday: 2450000,
        overduePortfolio: 8735000,
      },
      facturas: initialInvoices,

      editarConceptoFactura: (id, concepts) =>
        set((state) => ({
          facturas: state.facturas.map((invoice) =>
            invoice.id === id && ['DRAFT', 'PENDING'].includes(invoice.status)
              ? { ...invoice, concepts }
              : invoice,
          ),
        })),

      anularFactura: (id, role) => {
        if (role !== 'ADMIN') return false;
        const invoice = get().facturas.find((item) => item.id === id);
        if (!invoice || invoice.status !== 'ISSUED') return false;
        set((state) => ({
          facturas: state.facturas.map((item) =>
            item.id === id ? { ...item, status: 'CANCELLED' } : item,
          ),
        }));
        return true;
      },

      exportarFacturasMes: () => {
        const rows = [
          ['Número', 'Cliente', 'Emisión', 'Vencimiento', 'Estado', 'Total COP'],
          ...get().facturas.map((invoice) => [
            invoice.number,
            invoice.clientName,
            invoice.issueDate,
            invoice.dueDate,
            invoice.status,
            String(invoiceTotal(invoice)),
          ]),
        ];
        const csv = rows
          .map((row) => row.map((field) => `"${field.replaceAll('"', '""')}"`).join(','))
          .join('\r\n');
        downloadCsv(`\uFEFF${csv}`, `facturas-${new Date().toISOString().slice(0, 7)}.csv`);
      },
    }),
    {
      name: 'unitik-demo-billing',
      storage: demoStorage,
    },
  ),
);
