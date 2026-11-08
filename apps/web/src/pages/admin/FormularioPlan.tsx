import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { NewServicePlan, ServicePlan } from '../../stores/planes';

const planSchema = z.object({
  name: z.string().trim().min(1, 'El nombre del plan es obligatorio'),
  speedMbps: z.coerce.number().int('La velocidad debe ser un número entero').positive('La velocidad debe ser mayor a cero'),
  technology: z.enum(['FIBER', 'RADIO'], { required_error: 'Selecciona un tipo de tecnología' }),
  monthlyPrice: z.coerce.number().int('El valor debe ser un número entero').positive('El valor mensual debe ser mayor a cero'),
  reuseRatio: z
    .string()
    .trim()
    .regex(/^\d+:\d+$/, 'Usa el formato de reúso, por ejemplo 1:4'),
});

type PlanFormValues = z.infer<typeof planSchema>;

interface FormularioPlanProps {
  plan?: ServicePlan;
  onSave: (plan: NewServicePlan) => void;
  onCancel: () => void;
}

export default function FormularioPlan({ plan, onSave, onCancel }: FormularioPlanProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: plan?.name ?? '',
      speedMbps: plan?.speedMbps ?? 20,
      technology: plan?.technology ?? 'FIBER',
      monthlyPrice: plan?.monthlyPrice ?? 50000,
      reuseRatio: plan?.reuseRatio ?? '1:4',
    },
  });

  useEffect(() => {
    reset({
      name: plan?.name ?? '',
      speedMbps: plan?.speedMbps ?? 20,
      technology: plan?.technology ?? 'FIBER',
      monthlyPrice: plan?.monthlyPrice ?? 50000,
      reuseRatio: plan?.reuseRatio ?? '1:4',
    });
  }, [plan, reset]);

  const onSubmit = (values: PlanFormValues) => {
    onSave(values);
  };

  const inputClassName =
    'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-unitik-500 focus:outline-none focus:ring-2 focus:ring-unitik-100';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <section
        aria-labelledby="plan-form-title"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        role="dialog"
      >
        <header className="mb-5">
          <h2 className="text-xl font-bold text-slate-900" id="plan-form-title">
            {plan ? 'Editar plan' : 'Crear plan'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Define las características y tarifa mensual del servicio.
          </p>
        </header>

        {plan && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
            Nota: Los cambios de precio no afectarán las facturas emitidas anteriormente
          </p>
        )}

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <label className="block text-sm font-medium text-slate-700">
            Nombre del plan
            <input {...register('name')} className={inputClassName} placeholder="Ej. Fibra 50 Megas" />
            {errors.name && <span className="mt-1 block text-xs text-red-600">{errors.name.message}</span>}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Velocidad (Mbps)
              <input
                {...register('speedMbps')}
                className={inputClassName}
                min="1"
                placeholder="50"
                type="number"
              />
              {errors.speedMbps && (
                <span className="mt-1 block text-xs text-red-600">{errors.speedMbps.message}</span>
              )}
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Tecnología
              <select {...register('technology')} className={inputClassName}>
                <option value="FIBER">Fibra Óptica</option>
                <option value="RADIO">Radio Enlace</option>
              </select>
              {errors.technology && (
                <span className="mt-1 block text-xs text-red-600">{errors.technology.message}</span>
              )}
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Valor mensual (COP)
              <input
                {...register('monthlyPrice')}
                className={inputClassName}
                min="1"
                placeholder="85000"
                type="number"
              />
              {errors.monthlyPrice && (
                <span className="mt-1 block text-xs text-red-600">{errors.monthlyPrice.message}</span>
              )}
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Porcentaje de reúso
              <input
                {...register('reuseRatio')}
                className={inputClassName}
                placeholder="1:4"
                type="text"
              />
              {errors.reuseRatio && (
                <span className="mt-1 block text-xs text-red-600">{errors.reuseRatio.message}</span>
              )}
            </label>
          </div>

          <footer className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={onCancel}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="rounded-lg bg-unitik-600 px-4 py-2 text-sm font-semibold text-white hover:bg-unitik-700 disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {plan ? 'Guardar cambios' : 'Crear plan'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
