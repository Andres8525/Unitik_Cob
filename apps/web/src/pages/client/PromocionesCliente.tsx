import { useQuery } from '@tanstack/react-query';
import { Megaphone } from 'lucide-react';
import {
  ACTIVE_PROMOTIONS_QUERY_KEY,
  fetchActivePromotions,
  toDateInput,
} from '../../api/promotions';
import SecureImage from '../../components/SecureImage';

/** Offers published by UNITIK administrators, shown in the client portal. */
export default function PromocionesCliente() {
  const promotions = useQuery({
    queryKey: ACTIVE_PROMOTIONS_QUERY_KEY,
    queryFn: fetchActivePromotions,
    staleTime: 5 * 60_000,
  });

  // Advertising is secondary: hide the block while loading, on error or when empty.
  if (!promotions.data?.length) return null;

  return (
    <section aria-label="Ofertas UNITIK" className="space-y-3">
      <h2 className="flex items-center gap-2 px-1 text-sm font-bold text-slate-800">
        <Megaphone className="h-4 w-4 text-unitik-600" aria-hidden="true" />
        Ofertas para ti
      </h2>
      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
        {promotions.data.map((promotion) => (
          <article
            key={promotion.id}
            className="w-72 shrink-0 snap-start overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
          >
            {promotion.imageUrl ? (
              <SecureImage src={promotion.imageUrl} alt={promotion.title} className="h-36 w-full" />
            ) : (
              <div className="flex h-16 items-center bg-gradient-to-r from-unitik-600 to-emerald-500 px-4 text-white">
                <Megaphone className="h-5 w-5" aria-hidden="true" />
              </div>
            )}
            <div className="p-4">
              <h3 className="font-bold text-slate-900">{promotion.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{promotion.description}</p>
              {promotion.endsAt && (
                <p className="mt-2 text-xs font-medium text-amber-700">
                  Válida hasta el {toDateInput(promotion.endsAt)}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
