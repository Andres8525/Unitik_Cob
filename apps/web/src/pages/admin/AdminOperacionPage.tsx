import { Activity, RefreshCw, Router, Ticket, Wrench } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/http';
import DashboardShell, { type DashboardNavItem } from '../../components/DashboardShell';

interface NetworkDevice {
  id: string;
  name: string;
  deviceType: string;
  ipAddress: string;
  location: string;
  isActive: boolean;
  status: 'online' | 'offline' | 'unknown';
  lastPing: string | null;
}

interface InstallationRecord {
  id: string;
  clientId: string;
  serviceType: string;
  installationDate: string;
  extraCostsApplied: boolean;
}

interface SupportTicket {
  id: string;
  ticketNumber: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
}

const navItems: DashboardNavItem[] = [
  { label: 'Resumen', to: '/admin/dashboard' },
  { label: 'Clientes', to: '/admin/clientes' },
  { label: 'Planes', to: '/admin/planes' },
  { label: 'Políticas', to: '/admin/politicas' },
  { label: 'Facturación', to: '/admin/facturacion' },
  { label: 'Operación', to: '/admin/operacion', icon: <Wrench className="h-4 w-4" /> },
  { label: 'Informes', to: '/admin/informes' },
];

export default function AdminOperacionPage() {
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [installations, setInstallations] = useState<InstallationRecord[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingDevice, setRefreshingDevice] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadOperations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [deviceRows, installationRows, ticketRows] = await Promise.all([
        api<NetworkDevice[]>('/network/devices'),
        api<InstallationRecord[]>('/installations'),
        api<SupportTicket[]>('/tickets'),
      ]);
      setDevices(deviceRows);
      setInstallations(installationRows);
      setTickets(ticketRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el estado de operación.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOperations();
  }, [loadOperations]);

  const pingDevice = async (deviceId: string) => {
    setRefreshingDevice(deviceId);
    setNotice('');
    setError('');
    try {
      const result = await api<{ online: boolean }>(`/network/devices/${deviceId}/ping`, { method: 'POST' });
      setNotice(result.online ? 'El dispositivo respondió correctamente.' : 'No fue posible contactar el dispositivo.');
      await loadOperations();
    } catch (pingError) {
      setError(pingError instanceof Error ? pingError.message : 'Falló la prueba de conectividad.');
    } finally {
      setRefreshingDevice(null);
    }
  };

  const openTickets = tickets.filter((ticket) => ['OPEN', 'IN_PROGRESS'].includes(ticket.status));

  return (
    <DashboardShell title="Operación" subtitle="Estado de red, instalaciones y soporte." navItems={navItems}>
      <div className="space-y-5">
        <div className="flex justify-end">
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            disabled={loading}
            onClick={() => void loadOperations()}
            type="button"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar datos
          </button>
        </div>
        {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        {notice && <p className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800" role="status">{notice}</p>}

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Dispositivos activos', value: devices.filter((device) => device.isActive).length, icon: Router },
            { label: 'Instalaciones registradas', value: installations.length, icon: Wrench },
            { label: 'Tickets abiertos', value: openTickets.length, icon: Ticket },
          ].map(({ label, value, icon: Icon }) => (
            <article key={label} className="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <span className="rounded-lg bg-unitik-50 p-3 text-unitik-700"><Icon className="h-5 w-5" /></span>
              <div><p className="text-sm text-slate-500">{label}</p><p className="text-2xl font-bold text-slate-900">{value}</p></div>
            </article>
          ))}
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900"><Activity className="h-5 w-5 text-unitik-600" />Dispositivos de red</h2>
          {devices.length === 0 && !loading ? (
            <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No hay dispositivos registrados.</p>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {devices.map((device) => (
                <div key={device.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{device.name}</p>
                    <p className="text-sm text-slate-500">{device.deviceType} · {device.ipAddress} · {device.location}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      !device.isActive ? 'bg-slate-100 text-slate-600' :
                        device.status === 'online' ? 'bg-emerald-50 text-emerald-700' :
                          device.status === 'offline' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {!device.isActive ? 'Inactivo' : device.status === 'online' ? 'En línea' : device.status === 'offline' ? 'Sin respuesta reciente' : 'Sin verificar'}
                    </span>
                    <button
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      disabled={!device.isActive || refreshingDevice === device.id}
                      onClick={() => void pingDevice(device.id)}
                      type="button"
                    >
                      {refreshingDevice === device.id ? 'Probando…' : 'Probar conexión'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="font-semibold text-slate-900">Instalaciones recientes</h2>
            {installations.length === 0 && !loading ? <p className="mt-3 text-sm text-slate-500">Aún no hay instalaciones registradas.</p> : (
              <ul className="mt-3 divide-y divide-slate-100">
                {installations.slice(0, 6).map((record) => (
                  <li key={record.id} className="py-3 text-sm">
                    <p className="font-medium text-slate-800">{record.serviceType === 'FIBER' ? 'Fibra óptica' : 'Radio enlace'} · Cliente {record.clientId.slice(0, 8)}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(record.installationDate).toLocaleString('es-CO')} {record.extraCostsApplied ? '· Costos extra por revisar' : ''}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="font-semibold text-slate-900">Tickets de soporte</h2>
            {tickets.length === 0 && !loading ? <p className="mt-3 text-sm text-slate-500">No hay tickets registrados.</p> : (
              <ul className="mt-3 divide-y divide-slate-100">
                {tickets.slice(0, 6).map((ticket) => (
                  <li key={ticket.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                    <div><p className="font-medium text-slate-800">{ticket.ticketNumber} · {ticket.title}</p><p className="mt-1 text-xs text-slate-500">{ticket.category} · {new Date(ticket.createdAt).toLocaleDateString('es-CO')}</p></div>
                    <span className="whitespace-nowrap rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{ticket.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}
