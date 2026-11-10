import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { demoStorage } from './demoStorage';

export type PlanTechnology = 'FIBER' | 'RADIO';
export type PlanStatus = 'ACTIVE' | 'INACTIVE';

export interface ServicePlan {
  id: string;
  name: string;
  speedMbps: number;
  technology: PlanTechnology;
  monthlyPrice: number;
  reuseRatio: string;
  status: PlanStatus;
}

export type NewServicePlan = Omit<ServicePlan, 'id' | 'status'>;

interface PlanesState {
  planes: ServicePlan[];
  agregarPlan: (plan: NewServicePlan) => void;
  editarPlan: (id: string, plan: NewServicePlan) => void;
  cambiarEstadoPlan: (id: string, status: PlanStatus) => void;
}

const initialPlans: ServicePlan[] = [
  {
    id: 'plan-fiber-20',
    name: 'Fibra 20 Megas',
    speedMbps: 20,
    technology: 'FIBER',
    monthlyPrice: 50000,
    reuseRatio: '1:4',
    status: 'ACTIVE',
  },
  {
    id: 'plan-fiber-100',
    name: 'Fibra 100 Megas',
    speedMbps: 100,
    technology: 'FIBER',
    monthlyPrice: 100000,
    reuseRatio: '1:2',
    status: 'ACTIVE',
  },
  {
    id: 'plan-radio-12',
    name: 'Radio 12 Megas',
    speedMbps: 12,
    technology: 'RADIO',
    monthlyPrice: 50000,
    reuseRatio: '1:6',
    status: 'INACTIVE',
  },
];

export const usePlanesStore = create<PlanesState>()(
  persist(
    (set) => ({
      planes: initialPlans,
      agregarPlan: (plan) =>
        set((state) => ({
          planes: [
            ...state.planes,
            { ...plan, id: `plan-${Date.now()}-${state.planes.length}`, status: 'ACTIVE' },
          ],
        })),
      editarPlan: (id, plan) =>
        set((state) => ({
          planes: state.planes.map((current) =>
            current.id === id ? { ...current, ...plan } : current,
          ),
        })),
      cambiarEstadoPlan: (id, status) =>
        set((state) => ({
          planes: state.planes.map((current) =>
            current.id === id ? { ...current, status } : current,
          ),
        })),
    }),
    {
      name: 'unitik-demo-plans',
      storage: demoStorage,
    },
  ),
);
