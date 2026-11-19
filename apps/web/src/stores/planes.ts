import { create } from 'zustand';
import { api } from '../api/http';

export type PlanTechnology = 'FIBER' | 'RADIO';
export type PlanStatus = 'ACTIVE' | 'INACTIVE';

export interface ServicePlan {
  id: string;
  name: string;
  speedMbps: number;
  technology: PlanTechnology;
  monthlyPrice: number;
  /** Contention ratio shown in the UI, e.g. "1:4"; empty when the plan has no reuse set. */
  reuseRatio: string;
  status: PlanStatus;
}

export type NewServicePlan = Omit<ServicePlan, 'id' | 'status'>;

/** Plan as returned by GET /api/plans (Prisma Decimal fields arrive as strings). */
export interface ApiPlan {
  id: string;
  name: string;
  description: string;
  serviceType: PlanTechnology;
  speedMbps: number;
  monthlyPrice: string | number;
  reusePercent: number | null;
  isActive: boolean;
}

/** Body accepted by POST /api/plans and PATCH /api/plans/:id (CreatePlanDto). */
export interface PlanPayload {
  name: string;
  description: string;
  serviceType: PlanTechnology;
  speedMbps: number;
  monthlyPrice: number;
  reusePercent?: number;
}

/** "1:4" → 25 (% of a dedicated channel each subscriber is guaranteed). */
export function ratioToPercent(ratio: string): number | undefined {
  const match = /^(\d+):(\d+)$/.exec(ratio.trim());
  if (!match) return undefined;
  const [, shared, users] = match.map(Number);
  if (!shared || !users) return undefined;
  return Math.round((shared / users) * 10_000) / 100;
}

/** 25 → "1:4"; null/0 → "" (not configured). */
export function percentToRatio(percent: number | null | undefined): string {
  if (!percent || percent <= 0) return '';
  return `1:${Math.max(1, Math.round(100 / percent))}`;
}

export function toServicePlan(plan: ApiPlan): ServicePlan {
  return {
    id: plan.id,
    name: plan.name,
    speedMbps: plan.speedMbps,
    technology: plan.serviceType,
    monthlyPrice: Number(plan.monthlyPrice),
    reuseRatio: percentToRatio(plan.reusePercent),
    status: plan.isActive ? 'ACTIVE' : 'INACTIVE',
  };
}

export function toPlanPayload(plan: NewServicePlan): PlanPayload {
  const technologyLabel = plan.technology === 'FIBER' ? 'fibra óptica' : 'radio enlace';
  const reusePercent = ratioToPercent(plan.reuseRatio);
  return {
    name: plan.name.trim(),
    description: `Internet por ${technologyLabel} ${plan.speedMbps} Mbps`,
    serviceType: plan.technology,
    speedMbps: plan.speedMbps,
    monthlyPrice: plan.monthlyPrice,
    ...(reusePercent === undefined ? {} : { reusePercent }),
  };
}

interface PlanesState {
  planes: ServicePlan[];
  isLoading: boolean;
  error: string | null;
  cargarPlanes: () => Promise<void>;
  agregarPlan: (plan: NewServicePlan) => Promise<void>;
  editarPlan: (id: string, plan: NewServicePlan) => Promise<void>;
  cambiarEstadoPlan: (id: string, status: PlanStatus) => Promise<void>;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export const usePlanesStore = create<PlanesState>()((set) => ({
  planes: [],
  isLoading: false,
  error: null,

  cargarPlanes: async () => {
    set({ isLoading: true, error: null });
    try {
      const plans = await api<ApiPlan[]>('/plans');
      set({ planes: plans.map(toServicePlan), isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: errorMessage(error, 'No se pudieron cargar los planes.') });
    }
  },

  agregarPlan: async (plan) => {
    set({ error: null });
    try {
      const created = await api<ApiPlan>('/plans', {
        method: 'POST',
        body: JSON.stringify(toPlanPayload(plan)),
      });
      set((state) => ({ planes: [...state.planes, toServicePlan(created)] }));
    } catch (error) {
      set({ error: errorMessage(error, 'No se pudo crear el plan.') });
      throw error;
    }
  },

  editarPlan: async (id, plan) => {
    set({ error: null });
    try {
      const updated = await api<ApiPlan>(`/plans/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(toPlanPayload(plan)),
      });
      set((state) => ({
        planes: state.planes.map((current) => (current.id === id ? toServicePlan(updated) : current)),
      }));
    } catch (error) {
      set({ error: errorMessage(error, 'No se pudo actualizar el plan.') });
      throw error;
    }
  },

  cambiarEstadoPlan: async (id, status) => {
    set({ error: null });
    try {
      const updated = await api<ApiPlan>(`/plans/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: status === 'ACTIVE' }),
      });
      set((state) => ({
        planes: state.planes.map((current) => (current.id === id ? toServicePlan(updated) : current)),
      }));
    } catch (error) {
      set({ error: errorMessage(error, 'No se pudo cambiar el estado del plan.') });
    }
  },
}));
