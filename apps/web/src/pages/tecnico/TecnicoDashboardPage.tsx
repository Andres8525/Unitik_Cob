import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { TicketPriority, TicketStatus } from '@unitik/shared-types';
import { api } from '../../api/http';
import DashboardShell from '../../components/DashboardShell';
import { TECHNICIAN_NAV_ITEMS } from '../../components/navigation';
import { useAuthStore } from '../../stores/auth';

interface AssignedTicket {
  id: string;
  ticketNumber: string;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
}

interface InstallationSummary {
  id: string;
  serviceType: string;
  installationDate: string;
}

interface DeviceSummary {
  id: string;
  name: string;
  status?: 'online' | 'offline' | 'unknown';
  isActive: boolean;
}

const priorityStyles: Record<TicketPriority, string> = {
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-sky-100 text-sky-800',
  HIGH: 'bg-amber-100 text-amber-900',
  URGENT: 'bg-red-100 text-red-800',
};

const priorityLabels: Record<TicketPriority, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

const statusLabels: Record<TicketStatus, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En progreso',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
};

const nextStatus: Partial<Record<TicketStatus, { status: TicketStatus; label: string }>> = {
  OPEN: { status: 'IN_PROGRESS', label: 'Iniciar' },
  IN_PROGRESS: { status: 'RESOLVED', label: 'Resolver' },
};

function isToday(value: string): boolean {
  return new Date(value).toDateString() === new Date().toDateString();
}

export default function TecnicoDashboardPage() {
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();

  const tickets = useQuery({
    queryKey: ['tickets', 'assigned'],
    queryFn: () => api<AssignedTicket[]>('/tickets'),
  });
  const installations = useQuery({
    queryKey: ['installations', userId],
    queryFn: () =>
      api<InstallationSummary[]>(
        `/installations${userId ? `?technicianId=${encodeURIComponent(userId)}` : ''}`,
      ),
    // Actas are saved from another page through the technician store.
    refetchOnMount: 'always',
  });
  const devices = useQuery({
    queryKey: ['network', 'devices'],
    queryFn: () => api<DeviceSummary[]>('/network/devices'),
  });

  const updateTicket = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TicketStatus }) =>
      api<AssignedTicket>(`/tickets/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets'] }),
  });

  const queries = [tickets, installations, devices];
  const isLoading = queries.some((query) => query.isPending);
  const failed = queries.find((query) => query.isError);

  const openTickets = (tickets.data ?? []).filter(
    (ticket) => ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS',
  );
  const activeDevices = (devices.data ?? []).filter((device) => device.isActive);
  const cards = [
    {
      label: 'Instalaciones hoy',
      value: (installations.data ?? []).filter((item) => isToday(item.installationDate)).length,
      detail: `${installations.data?.length ?? 0} actas registradas`,
    },
    {
      label: 'Tickets abiertos',
      value: openTickets.length,
      detail: `${openTickets.filter((ticket) => ticket.priority === 'HIGH' || ticket.priority === 'URGENT').length} de prioridad alta o urgente`,
    },
    {
      label: 'Tickets en progreso',
      value: openTickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length,
      detail: 'Atención en curso',
    },
    {
      label: 'Equipos en línea',
      value: `${activeDevices.filter((device) => device.status === 'online').length} / ${activeDevices.length}`,
      detail: 'Infraestructura MikroTik / OLT',
    },
  ];

  return (
    <DashboardShell title="Técnico" subtitle="Operación de campo y soporte" navItems={TECHNICIAN_NAV_ITEMS}>
      {isLoading && (
        <p aria-busy="true" className="flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          Cargando operación del día…
        </p>
      )}

      {failed && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <span>No se pudo cargar toda la información: {failed.error?.message}</span>
          <button
            type="button"
            onClick={() => queries.forEach((query) => void query.refetch())}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-1.5 font-semibold hover:bg-red-100"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Reintentar
          </button>
        </div>
      )}

      {!isLoading && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className="mt-3 text-2xl font-bold text-slate-900">{card.value}</p>
              <p className="mt-2 text-xs text-slate-400">{card.detail}</p>
            </div>
          ))}
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          className="inline-flex items-center gap-2 rounded-lg bg-unitik-600 px-4 py-2 text-sm font-semibold text-white hover:bg-unitik-700"
          to="/tecnico/instalaciones"
        >
          Nueva acta de instalación
        </Link>
        <Link
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          to="/clientes/nuevo"
        >
          Registrar cliente
        </Link>
      </div>

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h3 className="mb-3 font-semibold text-slate-700">Tickets asignados</h3>
        {updateTicket.isError && (
          <p role="alert" className="mb-3 text-sm text-red-700">
            {updateTicket.error.message}
          </p>
        )}
        {tickets.data && openTickets.length === 0 && (
          <p className="text-sm text-slate-500">No tienes tickets pendientes.</p>
        )}
        <div className="space-y-3">
          {openTickets.map((ticket) => {
            const action = nextStatus[ticket.status];
            const isUpdating = updateTicket.isPending && updateTicket.variables?.id === ticket.id;
            return (
              <div
                key={ticket.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">
                    {ticket.ticketNumber} · {ticket.title}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${priorityStyles[ticket.priority]}`}>
                      {priorityLabels[ticket.priority]}
                    </span>
                    <span>{statusLabels[ticket.status]}</span>
                  </p>
                </div>
                {action && (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => updateTicket.mutate({ id: ticket.id, status: action.status })}
                    className="rounded-lg border border-unitik-200 bg-white px-3 py-1.5 text-xs font-semibold text-unitik-700 hover:bg-unitik-50 disabled:opacity-50"
                  >
                    {isUpdating ? 'Guardando…' : action.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </DashboardShell>
  );
}
