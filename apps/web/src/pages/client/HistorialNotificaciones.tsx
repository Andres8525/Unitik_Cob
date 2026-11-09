import { useEffect, useState } from 'react';
import { Bell, CalendarClock, CheckCircle2, Circle, CreditCard, ExternalLink, MessageCircle, ReceiptText, Wifi } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotificacionesStore, type Notificacion } from '../../stores/notificaciones';

const notificationStyles = {
  RECORDATORIO: {
    className: 'border-amber-200 bg-amber-50',
    iconClassName: 'bg-amber-100 text-amber-700',
    Icon: CreditCard,
  },
  PAGO: {
    className: 'border-emerald-200 bg-emerald-50',
    iconClassName: 'bg-emerald-100 text-emerald-700',
    Icon: CheckCircle2,
  },
  SOPORTE: {
    className: 'border-sky-200 bg-sky-50',
    iconClassName: 'bg-sky-100 text-sky-700',
    Icon: Wifi,
  },
} as const;

function formatDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function NotificationCard({
  notification,
  onRead,
}: {
  notification: Notificacion;
  onRead: (id: string) => void;
}) {
  const { Icon, className, iconClassName } = notificationStyles[notification.type];

  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm ${className} ${
        notification.read ? 'opacity-80' : ''
      }`}
      aria-label={`${notification.title}, ${notification.read ? 'leída' : 'no leída'}`}
    >
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconClassName}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900">{notification.title}</h2>
            {!notification.read && <Circle className="mt-1 h-2.5 w-2.5 shrink-0 fill-unitik-600 text-unitik-600" aria-label="No leída" />}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{notification.message}</p>
          <p className="mt-2 text-xs text-slate-500">{formatDate(notification.date)}</p>

          {notification.type === 'PAGO' && notification.transactionNumber && (
            <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-xs font-semibold text-emerald-900">
              Transacción: {notification.transactionNumber}
            </p>
          )}

          {notification.type === 'SOPORTE' && notification.scheduledAt && (
            <p className="mt-2 flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-xs font-semibold text-sky-900">
              <CalendarClock className="h-4 w-4 shrink-0" />
              Programado: {formatDate(notification.scheduledAt)}
            </p>
          )}

          {notification.type === 'RECORDATORIO' && (
            <Link
              to="/cliente/portal#reportar-pago"
              onClick={() => onRead(notification.id)}
              className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-bold text-white hover:bg-amber-700"
            >
              <CreditCard className="h-4 w-4" />
              Pagar ahora
            </Link>
          )}

          {notification.type === 'PAGO' && (
            <button
              type="button"
              onClick={() => {
                if (notification.receiptUrl) {
                  window.open(notification.receiptUrl, '_blank', 'noopener,noreferrer');
                } else {
                  console.info(`El recibo PDF de ${notification.transactionNumber ?? notification.id} aún no está disponible.`);
                }
                onRead(notification.id);
              }}
              className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800"
            >
              <ReceiptText className="h-4 w-4" />
              Ver recibo PDF
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}

          {notification.type === 'SOPORTE' && (
            <button
              type="button"
              onClick={() => onRead(notification.id)}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/80 px-4 text-sm font-semibold text-sky-900 hover:bg-white"
            >
              <MessageCircle className="h-4 w-4" />
              Entendido
            </button>
          )}

          {!notification.read && (
            <button
              type="button"
              onClick={() => onRead(notification.id)}
              className="ml-2 mt-3 min-h-11 px-2 text-xs font-semibold text-slate-600 underline underline-offset-2"
            >
              Marcar como leída
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function HistorialNotificaciones() {
  const canalesActivos = useNotificacionesStore((state) => state.canalesActivos);
  const numeroValidado = useNotificacionesStore((state) => state.numeroValidado);
  const notificaciones = useNotificacionesStore((state) => state.notificaciones);
  const isLoading = useNotificacionesStore((state) => state.isLoading);
  const error = useNotificacionesStore((state) => state.error);
  const source = useNotificacionesStore((state) => state.source);
  const refresh = useNotificacionesStore((state) => state.refresh);
  const marcarLeida = useNotificacionesStore((state) => state.marcarLeida);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const channelLabels: Record<(typeof canalesActivos)[number], string> = {
    PORTAL: 'Portal',
    SMS: 'SMS',
    WHATSAPP: 'WhatsApp',
  };

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-5 sm:py-8">
      <div className="mx-auto max-w-md space-y-4">
        <header className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-unitik-50 text-unitik-700">
              <Bell className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Notificaciones</h1>
              <p className="mt-1 text-sm text-slate-600">Avisos importantes de tu servicio UNITIK.</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Canales activos</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {canalesActivos.map((channel) => (
                <span
                  key={channel}
                  className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                >
                  {channelLabels[channel]}
                </span>
              ))}
            </div>
            {!numeroValidado && (
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                SMS y WhatsApp aparecerán cuando tu número de teléfono esté validado.
              </p>
            )}
          </div>
        </header>

        {source === 'DEMO' && (
          <p className="rounded-lg bg-slate-200 px-3 py-2 text-xs text-slate-600" role="note">
            Mostrando notificaciones de ejemplo.
          </p>
        )}

        {error && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
            {error}
          </p>
        )}

        {isLoading && notificaciones.length === 0 && (
          <p className="rounded-xl bg-white p-4 text-sm text-slate-500" role="status">
            Cargando notificaciones…
          </p>
        )}

        {actionError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {actionError}
          </p>
        )}

        <section aria-label="Historial de notificaciones" className="space-y-3">
          {notificaciones.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onRead={(id) => {
                setActionError('');
                void marcarLeida(id).catch(() =>
                  setActionError('No fue posible actualizar la notificación. Comprueba tu conexión e inténtalo de nuevo.'),
                );
              }}
            />
          ))}
          {!isLoading && notificaciones.length === 0 && (
            <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
              <Bell className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-600">No tienes notificaciones por ahora.</p>
            </div>
          )}
        </section>

        <Link
          to="/cliente/portal"
          className="flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Volver al Portal Principal
        </Link>
      </div>
    </main>
  );
}
