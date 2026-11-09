export const INSTALLATION_EXTRA_COSTS_APPLIED_EVENT = 'installation.extra_costs.applied';

export class InstallationExtraCostsAppliedEvent {
  constructor(
    public readonly installationId: string,
    public readonly clientId: string,
    public readonly technicianId: string,
    public readonly appliedAt: Date,
  ) {}
}
