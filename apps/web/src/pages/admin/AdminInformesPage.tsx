import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useState } from 'react';
import DashboardShell, { type DashboardNavItem } from '../../components/DashboardShell';
import { api, apiUrl, refreshSession } from '../../api/http';
import { isDemoMode } from '../../api/demo';
import { useAuthStore } from '../../stores/auth';

const navItems: DashboardNavItem[] = [
  { label: 'Resumen', to: '/admin/dashboard' },
  { label: 'Clientes', to: '/admin/clientes' },
  { label: 'Planes', to: '/admin/planes' },
  { label: 'Políticas', to: '/admin/politicas' },
  { label: 'Facturación', to: '/admin/facturacion' },
  { label: 'Operación', to: '/admin/operacion' },
  { label: 'Informes', to: '/admin/informes', icon: <FileText className="h-4 w-4" /> },
];

async function getReport(url: string): Promise<Response> {
  const request = () =>
    fetch(apiUrl(`/api${url}`), {
      headers: {
        ...(useAuthStore.getState().accessToken
          ? { Authorization: `Bearer ${useAuthStore.getState().accessToken}` }
          : {}),
      },
    });

  let response = isDemoMode()
    ? new Response(await api<string>(url), {
        headers: { 'Content-Type': 'text/csv; charset=utf-8' },
      })
    : await request();
  if (response.status === 401 && useAuthStore.getState().refreshToken) {
    if (await refreshSession()) response = await request();
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `No se pudo descargar el informe (${response.status}).`);
  }
  return response;
}

function saveCsv(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export default function AdminInformesPage() {
  const [loadingReport, setLoadingReport] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const downloadReport = async (report: 'collections' | 'clients') => {
    setLoadingReport(report);
    setError('');
    setNotice('');
    try {
      const endpoint =
        report === 'collections' ? '/reports/collections.csv' : '/reports/clients-by-plan.csv';
      const response = await getReport(endpoint);
      const blob = await response.blob();
      const fileName =
        report === 'collections' ? 'recaudo-unitik.csv' : 'clientes-por-plan-unitik.csv';
      saveCsv(blob, fileName);
      setNotice('El informe CSV se descargó correctamente.');
    } catch (downloadError) {
      setError(
        downloadError instanceof Error ? downloadError.message : 'No se pudo descargar el informe.',
      );
    } finally {
      setLoadingReport(null);
    }
  };

  return (
    <DashboardShell
      title="Informes"
      subtitle="Descarga reportes de recaudo y clientes por plan."
      navItems={navItems}
    >
      <section className="grid gap-5 md:grid-cols-2">
        {[
          {
            id: 'collections' as const,
            title: 'Recaudos validados',
            detail: 'Pagos validados, método, fecha y total recaudado.',
            icon: FileSpreadsheet,
          },
          {
            id: 'clients' as const,
            title: 'Clientes por plan',
            detail: 'Suscripciones activas agrupadas por plan e ingreso mensual estimado.',
            icon: FileText,
          },
        ].map(({ id, title, detail, icon: Icon }) => (
          <article key={id} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <span className="inline-flex rounded-lg bg-unitik-50 p-3 text-unitik-700">
              <Icon className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 min-h-10 text-sm text-slate-500">{detail}</p>
            <button
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-unitik-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-unitik-700 disabled:opacity-60"
              disabled={loadingReport !== null}
              onClick={() => void downloadReport(id)}
              type="button"
            >
              <Download className="h-4 w-4" />
              {loadingReport === id ? 'Generando…' : 'Descargar CSV'}
            </button>
          </article>
        ))}
      </section>
      {error && (
        <p
          className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          role="status"
        >
          {notice}
        </p>
      )}
      <p className="rounded-lg bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
        Los informes se generan desde la información persistida en el backend. El acceso está
        restringido al rol Administrador.
      </p>
    </DashboardShell>
  );
}
