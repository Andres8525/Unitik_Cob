import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { api } from '../api/http';
import { useAuthStore } from './auth';

export type NotificationType = 'RECORDATORIO' | 'PAGO' | 'SOPORTE';
export type NotificationChannel = 'PORTAL' | 'SMS' | 'WHATSAPP';

export interface Notificacion {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  date: string;
  suggestedAction: string;
  transactionNumber?: string;
  receiptUrl?: string;
  scheduledAt?: string;
  read: boolean;
  isDemo?: boolean;
}

interface ApiNotification {
  id: string;
  type: string;
  content: string;
  createdAt: string;
  status: string;
}

interface ApiClientVerification {
  phoneVerified?: boolean;
  phoneVerifiedAt?: string | null;
}

interface NotificacionesData {
  ownerUserId: string | null;
  numeroValidado: boolean;
  canalesActivos: NotificationChannel[];
  notificaciones: Notificacion[];
  source: 'DEMO' | 'API';
}

interface NotificacionesState extends NotificacionesData {
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  marcarLeida: (id: string) => Promise<void>;
  clear: () => void;
}

const demoNotifications = (): Notificacion[] => {
  const now = Date.now();
  return [
    {
      id: 'demo-reminder',
      type: 'RECORDATORIO',
      title: 'Tu factura está próxima a vencer',
      message: 'Recuerda pagar tu servicio de internet para evitar la suspensión.',
      date: new Date(now - 60 * 60 * 1000).toISOString(),
      suggestedAction: 'Pagar ahora',
      read: false,
      isDemo: true,
    },
    {
      id: 'demo-payment',
      type: 'PAGO',
      title: '¡Pago confirmado!',
      message: 'Recibimos tu pago correctamente. Gracias por estar al día.',
      date: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      suggestedAction: 'Ver recibo PDF',
      transactionNumber: 'TRX-2026-00482',
      read: false,
      isDemo: true,
    },
    {
      id: 'demo-support',
      type: 'SOPORTE',
      title: 'Mantenimiento programado',
      message: 'Realizaremos mantenimiento preventivo de la red. Puede presentarse una interrupción temporal.',
      date: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      suggestedAction: 'Ver horario',
      scheduledAt: new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString(),
      read: true,
      isDemo: true,
    },
  ];
};

export const getActiveNotificationChannels = (numeroValidado: boolean): NotificationChannel[] => [
  'PORTAL',
  ...(numeroValidado ? (['SMS', 'WHATSAPP'] as const) : []),
];

const initialData = (): NotificacionesData => ({
  ownerUserId: null,
  numeroValidado: false,
  canalesActivos: getActiveNotificationChannels(false),
  notificaciones: demoNotifications(),
  source: 'DEMO',
});

function mapApiNotification(notification: ApiNotification): Notificacion {
  const normalizedType = notification.type.toUpperCase();
  const type: NotificationType = normalizedType.includes('OVERDUE') || normalizedType.includes('PROMISE')
    ? 'RECORDATORIO'
    : normalizedType.includes('PAYMENT') || normalizedType.includes('PAGO')
      ? 'PAGO'
      : 'SOPORTE';

  const title =
    type === 'RECORDATORIO'
      ? 'Recordatorio de pago'
      : type === 'PAGO'
        ? normalizedType.includes('REJECT')
          ? 'Pago requiere revisión'
          : 'Actualización de pago'
        : 'Aviso de servicio';

  return {
    id: notification.id,
    type,
    title,
    message: notification.content,
    date: notification.createdAt,
    suggestedAction:
      type === 'RECORDATORIO' ? 'Pagar ahora' : type === 'PAGO' ? 'Ver recibo PDF' : 'Ver detalle',
    transactionNumber: notification.content.match(/\b(?:TRX|REF|RAD)[-#\s]?[A-Z0-9-]+\b/i)?.[0],
    scheduledAt: notification.content.match(
      /\b\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2})?\b/,
    )?.[0],
    read: notification.status === 'READ',
  };
}

export const useNotificacionesStore = create<NotificacionesState>()(
  persist(
    (set, get) => ({
      ...initialData(),
      isLoading: false,
      error: null,
      refresh: async () => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) {
          set({ error: 'Inicia sesión para consultar tus notificaciones.', isLoading: false });
          return;
        }

        set({ isLoading: true, error: null });
        const [notificationResult, clientResult] = await Promise.allSettled([
          api<ApiNotification[]>('/notifications/my'),
          api<ApiClientVerification>('/clients/me'),
        ]);
        const verifiedFromApi =
          clientResult.status === 'fulfilled' &&
          (clientResult.value.phoneVerified === true ||
            (!!clientResult.value.phoneVerifiedAt &&
              !Number.isNaN(Date.parse(clientResult.value.phoneVerifiedAt))));
        const loadedNotifications =
          notificationResult.status === 'fulfilled' ? notificationResult.value : null;

        set((state) => {
          const sameUser = state.ownerUserId === userId;
          const phoneVerified =
            clientResult.status === 'fulfilled'
              ? verifiedFromApi
              : sameUser && state.numeroValidado;
          const hasApiNotifications = !!loadedNotifications?.length;
          const notificaciones = hasApiNotifications
            ? loadedNotifications.map(mapApiNotification)
            : sameUser && state.source === 'API'
              ? state.notificaciones
              : demoNotifications();
          const failed =
            notificationResult.status === 'rejected' || clientResult.status === 'rejected';

          return {
            ownerUserId: userId,
            numeroValidado: phoneVerified,
            canalesActivos: getActiveNotificationChannels(phoneVerified),
            notificaciones,
            source: hasApiNotifications ? 'API' : 'DEMO',
            isLoading: false,
            error: failed
              ? sameUser
                ? 'No se pudieron actualizar todos los datos. Se conserva la información disponible.'
                : 'No fue posible conectar. Se muestran notificaciones de ejemplo.'
              : null,
          };
        });
      },
      marcarLeida: async (id) => {
        const notification = get().notificaciones.find((item) => item.id === id);
        if (!notification || notification.read) return;

        if (!notification.isDemo) {
          await api(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
        }
        set((state) => ({
          notificaciones: state.notificaciones.map((item) =>
            item.id === id ? { ...item, read: true } : item,
          ),
        }));
      },
      clear: () => {
        set({
          ...initialData(),
          notificaciones: demoNotifications(),
          isLoading: false,
          error: null,
        });
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem('unitik-notificaciones');
        }
      },
    }),
    {
      name: 'unitik-notificaciones',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        ownerUserId: state.ownerUserId,
        numeroValidado: state.numeroValidado,
        canalesActivos: state.canalesActivos,
        notificaciones: state.notificaciones,
        source: state.source,
      }),
    },
  ),
);
