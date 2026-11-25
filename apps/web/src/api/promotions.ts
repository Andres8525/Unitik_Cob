import { api } from './http';

/** Promotion as returned by /api/promotions (dates are ISO strings). */
export interface Promotion {
  id: string;
  title: string;
  description: string;
  imageFileId: string | null;
  imageUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface PromotionInput {
  title: string;
  description: string;
  imageFileId?: string;
  startsAt?: string;
  endsAt?: string;
  isActive?: boolean;
}

export const PROMOTIONS_QUERY_KEY = ['promotions'] as const;
export const ACTIVE_PROMOTIONS_QUERY_KEY = ['promotions', 'active'] as const;

export const fetchPromotions = () => api<Promotion[]>('/promotions');
export const fetchActivePromotions = () => api<Promotion[]>('/promotions/active');

export const createPromotion = (input: PromotionInput) =>
  api<Promotion>('/promotions', { method: 'POST', body: JSON.stringify(input) });

export const updatePromotion = (id: string, input: Partial<PromotionInput>) =>
  api<Promotion>(`/promotions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

export const deletePromotion = (id: string) =>
  api<{ deleted: true }>(`/promotions/${encodeURIComponent(id)}`, { method: 'DELETE' });

/** "2026-12-31T23:59:59-05:00" → "2026-12-31" for <input type="date">. */
export function toDateInput(value: string | null): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}
