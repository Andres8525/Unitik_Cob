import { zodResolver } from '@hookform/resolvers/zod';
import { Search, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { api } from '../../api/http';
import DashboardShell, { type DashboardNavItem } from '../../components/DashboardShell';

interface AdminClient {
  id: string;
  clientCode: string;
  address: string;
  serviceType: 'FIBER' | 'RADIO';
  paymentModality: 'PREPAID' | 'POSTPAID';
  status: string;
  user: {
    documentId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

const searchSchema = z.object({
  search: z.string().trim().max(100, 'La búsqueda no puede superar 100 caracteres'),
});

type SearchValues = z.infer<typeof searchSchema>;

const navItems: DashboardNavItem[] = [
  { label: 'Resumen', to: '/admin/dashboard' },
  { label: 'Clientes', to: '/admin/clientes', icon: <Users className="h-4 w-4" /> },
  { label: 'Planes', to: '/admin/planes' },
  { label: 'Políticas', to: '/admin/politicas' },
  { label: 'Facturación', to: '/admin/facturacion' },
  { label: 'Operación', to: '/admin/operacion' },
  { label: 'Informes', to: '/admin/informes' },
];

export default function AdminClientesPage() {
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SearchValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: { search: '' },
  });

  const loadClients = async (values: SearchValues) => {
    setLoading(true);
    setError('');
    try {
      const query = values.search ? `?search=${encodeURIComponent(values.search)}` : '';
      setClients(await api<AdminClient[]>(`/clients${query}`));
      setHasLoaded(true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los clientes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardShell title="Clientes" subtitle="Consulta y seguimiento de clientes registrados." navItems={navItems}>
      <section className="space-y-5">
        <div className="flex flex-col gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-end sm:justify-between">
          <form className="flex w-full flex-col gap-3 sm:flex-row" onSubmit={handleSubmit(loadClients)}>
            <label className="flex-1 text-sm font-medium text-slate-700">
              Buscar cliente
              <span className="relative mt-1 block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  {...register('search')}
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-unitik-500 focus:outline-none focus:ring-2 focus:ring-unitik-100"
                  placeholder="Nombre, cédula o código"
                />
              </span>
              {errors.search && <span className="mt-1 block text-xs text-red-600">{errors.search.message}</span>}
            </label>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-unitik-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-unitik-700 disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              <Search className="h-4 w-4" />
              {loading ? 'Buscando…' : 'Buscar'}
            </button>
          </form>
          <Link
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            to="/clientes/nuevo"
          >
            <UserPlus className="h-4 w-4" />
            Nuevo cliente
          </Link>
        </div>

        {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}

        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          {clients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Cliente</th>
                    <th className="px-5 py-3">Contrato</th>
                    <th className="px-5 py-3">Servicio</th>
                    <th className="px-5 py-3">Contacto</th>
                    <th className="px-5 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clients.map((client) => (
                    <tr key={client.id} className="text-slate-700">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">{client.user.firstName} {client.user.lastName}</p>
                        <p className="text-xs text-slate-500">C.C. {client.user.documentId}</p>
                      </td>
                      <td className="px-5 py-4 font-medium">{client.clientCode}</td>
                      <td className="px-5 py-4">{client.serviceType === 'FIBER' ? 'Fibra óptica' : 'Radio enlace'}</td>
                      <td className="px-5 py-4">
                        <p>{client.user.phone}</p>
                        <p className="text-xs text-slate-500">{client.user.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          client.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' :
                            client.status === 'SUSPENDED' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {client.status === 'ACTIVE' ? 'Activo' : client.status === 'SUSPENDED' ? 'Suspendido' : client.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <Users className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-700">
                {loading ? 'Cargando clientes…' : hasLoaded ? 'No se encontraron clientes.' : 'Busca un cliente para consultar sus datos.'}
              </p>
              <p className="mt-1 text-xs text-slate-500">Los resultados se consultan directamente desde el sistema.</p>
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
