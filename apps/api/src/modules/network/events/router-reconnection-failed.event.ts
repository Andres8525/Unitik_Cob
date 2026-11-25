export const ROUTER_RECONNECTION_FAILED_EVENT = 'router.reconexion.fallida';

export class RouterReconnectionFailedEvent {
  constructor(
    public readonly clientId: string,
    /** Null when the client has no network access registered (no acta yet). */
    public readonly networkAccessId: string | null,
    public readonly paymentId: string,
    public readonly deviceId: string | null,
    public readonly ipAssigned: string | null,
    public readonly macAddress: string | null,
    public readonly attempts: number,
    public readonly reason: string,
    public readonly failedAt: Date,
  ) {}
}
