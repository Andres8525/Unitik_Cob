import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, LoaderCircle, Megaphone, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { uploadFile } from '../../api/files';
import {
  createPromotion,
  deletePromotion,
  fetchPromotions,
  PROMOTIONS_QUERY_KEY,
  toDateInput,
  updatePromotion,
  type Promotion,
  type PromotionInput,
} from '../../api/promotions';
import DashboardShell from '../../components/DashboardShell';
import ImageUploadField from '../../components/ImageUploadField';
import { ADMIN_NAV_ITEMS } from '../../components/navigation';
import SecureImage from '../../components/SecureImage';

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-unitik-500 focus:outline-none focus:ring-2 focus:ring-unitik-100';

interface FormState {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
}

const EMPTY_FORM: FormState = { title: '', description: '', startsAt: '', endsAt: '' };

function windowLabel(promotion: Promotion): string {
  const start = toDateInput(promotion.startsAt);
  const end = toDateInput(promotion.endsAt);
  if (start && end) return `Del ${start} al ${end}`;
  if (start) return `Desde el ${start}`;
  if (end) return `Hasta el ${end}`;
  return 'Sin fecha de vencimiento';
}

function isExpired(promotion: Promotion): boolean {
  return Boolean(promotion.endsAt && new Date(promotion.endsAt) < new Date());
}

/** Admin "Publicidad": offers and banners shown in the client portal. */
export default function PublicidadPage() {
  const queryClient = useQueryClient();
  const promotions = useQuery({ queryKey: PROMOTIONS_QUERY_KEY, queryFn: fetchPromotions });
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [image, setImage] = useState<File | null>(null);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: PROMOTIONS_QUERY_KEY });

  const save = useMutation({
    mutationFn: async () => {
      const uploaded = image ? await uploadFile(image, 'PROMOTION') : null;
      const input: PromotionInput = {
        title: form.title.trim(),
        description: form.description.trim(),
        ...(uploaded ? { imageFileId: uploaded.id } : {}),
        ...(form.startsAt ? { startsAt: form.startsAt } : {}),
        ...(form.endsAt ? { endsAt: form.endsAt } : {}),
      };
      return editing ? updatePromotion(editing.id, input) : createPromotion(input);
    },
    onSuccess: () => {
      setForm(EMPTY_FORM);
      setImage(null);
      setEditing(null);
      void refresh();
    },
    onError: (error) =>
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar.'),
  });

  const toggle = useMutation({
    mutationFn: (promotion: Promotion) =>
      updatePromotion(promotion.id, { isActive: !promotion.isActive }),
    onSuccess: () => void refresh(),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deletePromotion(id),
    onSuccess: () => void refresh(),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!form.title.trim() || !form.description.trim()) {
      setFormError('El título y la descripción son obligatorios.');
      return;
    }
    if (form.startsAt && form.endsAt && form.endsAt < form.startsAt) {
      setFormError('La fecha de fin debe ser posterior a la de inicio.');
      return;
    }
    save.mutate();
  };

  const startEdit = (promotion: Promotion) => {
    setEditing(promotion);
    setImage(null);
    setFormError(null);
    setForm({
      title: promotion.title,
      description: promotion.description,
      startsAt: toDateInput(promotion.startsAt),
      endsAt: toDateInput(promotion.endsAt),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <DashboardShell
      title="Publicidad"
      subtitle="Publica ofertas e imágenes que verán los clientes en su portal."
      navItems={ADMIN_NAV_ITEMS}
    >
      <form
        onSubmit={submit}
        noValidate
        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6"
      >
        <h3 className="flex items-center gap-2 font-bold text-slate-900">
          <Megaphone className="h-5 w-5 text-unitik-600" aria-hidden="true" />
          {editing ? `Editar “${editing.title}”` : 'Nueva publicación'}
        </h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_18rem]">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Título
              <input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                maxLength={80}
                className={inputClass}
                placeholder="Ej. Sube a Fibra 100 Megas"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Descripción de la oferta
              <textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                maxLength={500}
                rows={4}
                className={inputClass}
                placeholder="Condiciones, precio y cómo acceder a la oferta"
              />
              <span className="mt-1 block text-right text-xs text-slate-400">
                {form.description.length}/500
              </span>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Visible desde (opcional)
                <input
                  type="date"
                  value={form.startsAt}
                  onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Visible hasta (opcional)
                <input
                  type="date"
                  value={form.endsAt}
                  onChange={(event) => setForm({ ...form, endsAt: event.target.value })}
                  className={inputClass}
                />
              </label>
            </div>
          </div>
          <ImageUploadField
            label={editing?.imageUrl ? 'Reemplazar imagen (opcional)' : 'Imagen (opcional)'}
            hint="Banner horizontal recomendado · JPG, PNG o WEBP · máx. 5 MB"
            value={image}
            onChange={setImage}
            disabled={save.isPending}
          />
        </div>
        {formError && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {formError}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
          <button
            type="submit"
            disabled={save.isPending}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-unitik-600 px-4 text-sm font-semibold text-white hover:bg-unitik-700 disabled:opacity-50"
          >
            {save.isPending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {editing ? 'Guardar cambios' : 'Publicar'}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(EMPTY_FORM);
                setImage(null);
              }}
              className="min-h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar edición
            </button>
          )}
        </div>
      </form>

      <section aria-label="Publicaciones" className="space-y-3">
        {promotions.isPending && <p className="text-sm text-slate-500">Cargando publicaciones…</p>}
        {promotions.isError && (
          <p role="alert" className="text-sm text-red-700">
            No se pudieron cargar las publicaciones: {promotions.error.message}
          </p>
        )}
        {promotions.data?.length === 0 && (
          <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
            Aún no hay publicaciones. Las que crees aparecerán en el portal de los clientes.
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {promotions.data?.map((promotion) => (
            <article
              key={promotion.id}
              className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 ${
                promotion.isActive ? '' : 'opacity-70'
              }`}
            >
              {promotion.imageUrl ? (
                <SecureImage
                  src={promotion.imageUrl}
                  alt={promotion.title}
                  className="h-40 w-full"
                />
              ) : (
                <div className="flex h-20 items-center justify-center bg-gradient-to-r from-unitik-600 to-emerald-500 text-white">
                  <Megaphone className="h-6 w-6" aria-hidden="true" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-slate-900">{promotion.title}</h4>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      !promotion.isActive
                        ? 'bg-slate-100 text-slate-600'
                        : isExpired(promotion)
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {!promotion.isActive ? 'Pausada' : isExpired(promotion) ? 'Vencida' : 'Visible'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{promotion.description}</p>
                <p className="mt-2 text-xs text-slate-400">{windowLabel(promotion)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(promotion)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Editar
                  </button>
                  <button
                    type="button"
                    disabled={toggle.isPending}
                    onClick={() => toggle.mutate(promotion)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {promotion.isActive ? (
                      <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {promotion.isActive ? 'Pausar' : 'Activar'}
                  </button>
                  <button
                    type="button"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm(`¿Eliminar la publicación “${promotion.title}”?`)) {
                        remove.mutate(promotion.id);
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Eliminar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
