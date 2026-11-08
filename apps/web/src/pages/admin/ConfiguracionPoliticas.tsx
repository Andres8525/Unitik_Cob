import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Banknote, BarChart3, CreditCard, FileText, Settings, Users, Wrench } from 'lucide-react';
import { api, ApiError } from '../../api/http';
import DashboardShell, { type DashboardNavItem } from '../../components/DashboardShell';
import {
  usePoliticasStore,
  type ActivePaymentPromise,
  type BillingPolicies,
} from '../../stores/politicas';
import ModalPromesaPago from './ModalPromesaPago';

const policySchema = z
  .object({
    cutOffDayStart: z.coerce.number().int().min(1).max(31),
    cutOffDayEnd: z.coerce.number().int().min(1).max(31),
    interestRatePercent: z.coerce.number().min(0).max(100),
    doublePaymentEnabled: z.boolean(),
  })
  .refine((values) => values.cutOffDayStart <= values.cutOffDayEnd, {
    message: 'El día inicial debe ser menor o igual al día final.',
    path: ['cutOffDayEnd'],
  });

type PolicyFormValues = z.infer<typeof policySchema>;

const navItems: DashboardNavItem[] = [
  { label: 'Resumen', to: '/admin/dashboard', icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Clientes', to: '/admin/clientes', icon: <Users className="h-4 w-4" /> },
  { label: 'Planes', to: '/admin/planes', icon: <Banknote className="h-4 w-4" /> },
  { label: 'Políticas', to: '/admin/politicas', icon: <Settings className="h-4 w-4" /> },
  { label: 'Facturación', to: '/admin/facturacion', icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Operación', to: '/admin/operacion', icon: <Wrench className="h-4 w-4" /> },
  { label: 'Informes', to: '/admin/informes', icon: <FileText className="h-4 w-4" /> },
];

function getPromiseClientName(promise: ActivePaymentPromise): string {
  return `${promise.client.user.firstName} ${promise.client.user.lastName}`;
}

export default function ConfiguracionPoliticas() {
  const [modalOpen, setModalOpen] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const policiesLoaded = usePoliticasStore((state) => state.politicasCargadas);
  const cutOffRange = usePoliticasStore((state) => state.rangoFechasCorte);
  const interestRate = usePoliticasStore((state) => state.porcentajeMora);
  const doublePaymentEnabled = usePoliticasStore((state) => state.dobleMensualidadActiva);
  const promises = usePoliticasStore((state) => state.promesasDePago);
  const loadPolicies = usePoliticasStore((state) => state.cargarPoliticas);
  const updatePolicies = usePoliticasStore((state) => state.actualizarPoliticas);
  const loadPromises = usePoliticasStore((state) => state.cargarPromesas);
  const activePromiseQuery = useQuery({
    queryKey: ['active-payment-promises'],
    queryFn: () => api<ActivePaymentPromise[]>('/payment-promises/active'),
  });
  const [loadError, setLoadError] = useState('');

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema),
    defaultValues: {
      cutOffDayStart: cutOffRange.inicio,
      cutOffDayEnd: cutOffRange.fin,
      interestRatePercent: interestRate,
      doublePaymentEnabled,
    },
  });
  const doublePaymentEnabledForm = watch('doublePaymentEnabled');

  useEffect(() => {
    void Promise.all([loadPolicies(), loadPromises()])
      .then(() => setLoadError(''))
      .catch((error: unknown) => {
        setLoadError(
          error instanceof ApiError ? error.message : 'No fue posible cargar las políticas del sistema.',
        );
      });
  }, [loadPolicies, loadPromises]);

  useEffect(() => {
    if (policiesLoaded) {
      reset({
        cutOffDayStart: cutOffRange.inicio,
        cutOffDayEnd: cutOffRange.fin,
        interestRatePercent: interestRate,
        doublePaymentEnabled,
      });
    }
  }, [policiesLoaded, cutOffRange, interestRate, doublePaymentEnabled, reset]);

  useEffect(() => {
    if (activePromiseQuery.data) {
      usePoliticasStore.setState({ promesasDePago: activePromiseQuery.data });
    }
  }, [activePromiseQuery.data]);

  const savePolicies = async (values: PolicyFormValues) => {
    setSaveError('');
    setSaveSuccess(false);
    const policyValues: BillingPolicies = values;
    try {
      await updatePolicies(policyValues);
      setSaveSuccess(true);
    } catch (error) {
      setSaveError(
        error instanceof ApiError ? error.message : 'No fue posible guardar las políticas.',
      );
    }
  };

  const refreshPromises = async () => {
    await Promise.all([loadPromises(), activePromiseQuery.refetch()]);
  };

  return (
    <DashboardShell
      title="Políticas de corte y mora"
      subtitle="Configura reglas globales de facturación y excepciones de pago."
      navItems={navItems}
    >
      {loadError && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {loadError}
        </p>
      )}

      <form
        className="space-y-6"
        onSubmit={handleSubmit(savePolicies)}
        noValidate
      >
        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-5">
            <h3 className="font-semibold text-slate-900">Reglas globales de facturación</h3>
            <p className="mt-1 text-sm text-slate-500">Los cambios se aplican a las reglas de cobro futuras.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Rango de fechas de corte</p>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-slate-500">
                  Día inicial
                  <input
                    {...register('cutOffDayStart')}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-unitik-500 focus:outline-none"
                    max={31}
                    min={1}
                    type="number"
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Día final
                  <input
                    {...register('cutOffDayEnd')}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-unitik-500 focus:outline-none"
                    max={31}
                    min={1}
                    type="number"
                  />
                </label>
              </div>
              {(errors.cutOffDayStart || errors.cutOffDayEnd) && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.cutOffDayStart?.message ?? errors.cutOffDayEnd?.message}
                </p>
              )}
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Porcentaje de interés por mora
              <div className="relative mt-1">
                <input
                  {...register('interestRatePercent')}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-9 text-sm text-slate-900 focus:border-unitik-500 focus:outline-none"
                  max={100}
                  min={0}
                  step="0.1"
                  type="number"
                />
                <span className="absolute right-3 top-2 text-sm text-slate-400">%</span>
              </div>
              {errors.interestRatePercent && (
                <span className="mt-1 block text-xs text-red-600">{errors.interestRatePercent.message}</span>
              )}
            </label>
          </div>

          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">
              Atención: Toda modificación en el porcentaje de mora quedará registrada en la bitácora de auditoría con su usuario y fecha.
            </p>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Cobro de dos mensualidades por mora extrema
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {doublePaymentEnabledForm
                  ? 'La penalización por mora extrema está activada.'
                  : 'La penalización por mora extrema está desactivada.'}
              </p>
            </div>
            <Controller
              control={control}
              name="doublePaymentEnabled"
              render={({ field }) => (
                <button
                  aria-checked={field.value}
                  aria-label="Activar cobro de dos mensualidades"
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition ${
                    field.value ? 'bg-unitik-600' : 'bg-slate-300'
                  }`}
                  onClick={() => field.onChange(!field.value)}
                  role="switch"
                  type="button"
                >
                  <span
                    className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition ${
                      field.value ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              )}
            />
          </div>

          {saveError && <p className="mt-4 text-sm text-red-600" role="alert">{saveError}</p>}
          {saveSuccess && (
            <p className="mt-4 text-sm text-emerald-700" role="status">Políticas guardadas correctamente.</p>
          )}
          <div className="mt-5 flex justify-end">
            <button
              className="rounded-lg bg-unitik-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-unitik-700 disabled:opacity-50"
              disabled={isSubmitting || !policiesLoaded}
              type="submit"
            >
              {isSubmitting ? 'Guardando…' : 'Guardar políticas'}
            </button>
          </div>
        </section>
      </form>

      <section className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
          <div>
            <h3 className="font-semibold text-slate-900">Excepciones y promesas de pago</h3>
            <p className="mt-1 text-sm text-slate-500">
              Clientes con promesa vigente quedan protegidos del corte automático.
            </p>
          </div>
          <button
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => setModalOpen(true)}
            type="button"
          >
            Registrar promesa
          </button>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Cliente</th>
                <th className="px-5 py-3 font-semibold">Factura</th>
                <th className="px-5 py-3 font-semibold">Días adicionales</th>
                <th className="px-5 py-3 font-semibold">Vigente hasta</th>
                <th className="px-5 py-3 font-semibold">Protección de corte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {promises.map((promise) => (
                <tr className="text-slate-700" key={promise.id}>
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-900">{getPromiseClientName(promise)}</p>
                    <p className="text-xs text-slate-500">{promise.client.clientCode}</p>
                  </td>
                  <td className="px-5 py-4">{promise.invoice.invoiceNumber}</td>
                  <td className="px-5 py-4">{promise.daysExtension} días</td>
                  <td className="px-5 py-4">
                    {new Date(promise.promiseDate).toLocaleDateString('es-CO')}
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                      Corte pausado
                    </span>
                  </td>
                </tr>
              ))}
              {!activePromiseQuery.isLoading && promises.length === 0 && (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500" colSpan={5}>
                    No hay promesas de pago activas.
                  </td>
                </tr>
              )}
              {activePromiseQuery.isError && (
                <tr>
                  <td className="px-5 py-5 text-center text-sm text-red-600" colSpan={5}>
                    No fue posible cargar las promesas activas.{' '}
                    <button className="font-semibold underline" onClick={() => void refreshPromises()} type="button">
                      Reintentar
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && (
        <ModalPromesaPago
          onClose={() => {
            setModalOpen(false);
            void refreshPromises();
          }}
        />
      )}
    </DashboardShell>
  );
}
