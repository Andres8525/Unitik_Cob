export const ROUTER_RECONNECTION_FAILED_EVENT = 'router.reconexion.fallida';

export class RouterReconnectionFailedEvent {
  constructor(
    public readonly clientId: string,
    public readonly networkAccessId: string,
    public readonly paymentId: string,
    public readonly deviceId: string,
    public readonly ipAssigned: string | null,
    public readonly macAddress: string | null,
    public readonly attempts: number,
    public readonly reason: string,
    public readonly failedAt: Date,
  ) {}
}
