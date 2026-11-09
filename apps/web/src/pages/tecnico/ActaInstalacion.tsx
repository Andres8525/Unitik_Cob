import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CheckCircle2, Info, MapPinned, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import DashboardShell, { type DashboardNavItem } from '../../components/DashboardShell';
import { actaInstalacionSchema, type ActaInstalacionFormValues } from '../../schemas/actaInstalacion';
import { useTecnicoStore } from '../../stores/tecnico';

const navItems: DashboardNavItem[] = [
  { label: 'Resumen', to: '/tecnico/dashboard' },
  { label: 'Acta de instalación', to: '/tecnico/instalaciones' },
  { label: 'Registrar cliente', to: '/clientes/nuevo' },
];

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-unitik-500 focus:ring-2 focus:ring-unitik-100 disabled:bg-slate-100';

const initialFormValues: ActaInstalacionFormValues = {
  clientId: '',
  deviceId: '',
  macAddress: '',
  ipAddress: '',
  aplicarCostosExtra: false,
  observaciones: '',
};

export default function ActaInstalacion() {
  const navigate = useNavigate();
  const clientes = useTecnicoStore((state) => state.clientes);
  const dispositivos = useTecnicoStore((state) => state.dispositivos);
  const catalogosLoading = useTecnicoStore((state) => state.catalogosLoading);
  const catalogosError = useTecnicoStore((state) => state.catalogosError);
  const actaGuardada = useTecnicoStore((state) => state.actaGuardada);
  const cargarCatalogos = useTecnicoStore((state) => state.cargarCatalogos);
  const guardarActaInstalacion = useTecnicoStore((state) => state.guardarActaInstalacion);
  const limpiarActaGuardada = useTecnicoStore((state) => state.limpiarActaGuardada);
  const [saveError, setSaveError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ActaInstalacionFormValues>({
    resolver: zodResolver(actaInstalacionSchema),
    defaultValues: initialFormValues,
  });

  useEffect(() => {
    void cargarCatalogos().catch(() => undefined);
  }, [cargarCatalogos]);

  const submit = async (values: ActaInstalacionFormValues) => {
    setSaveError('');
    limpiarActaGuardada();
    try {
      await guardarActaInstalacion(values);
      reset(initialFormValues);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'No se pudo guardar el acta.');
    }
  };

  return (
    <DashboardShell title="Técnico" subtitle="Registro de instalación y equipo de red" navItems={navItems}>
      <section className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <header className="mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-unitik-50 text-unitik-700">
            <MapPinned className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-900 sm:text-2xl">Acta de Instalación Técnica</h2>
          <p className="mt-1 text-sm text-slate-500">
            Registra el equipo, su dirección de red y las observaciones del trabajo en terreno.
          </p>
        </header>

        {actaGuardada && (
          <div className="mb-5 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Acta registrada y equipo vinculado.</p>
              <p className="mt-1">El cliente quedó activo. Identificador del acta: {actaGuardada.installation.id}</p>
            </div>
          </div>
        )}

        {(catalogosError || saveError) && (
          <div className="mb-5 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{catalogosError || saveError}</span>
          </div>
        )}

        <form className="space-y-5" noValidate onSubmit={handleSubmit(submit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Cliente
              <select {...register('clientId')} className={inputClass} disabled={catalogosLoading}>
                <option value="">Selecciona un cliente</option>
                {clientes.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.clientCode} — {client.user.firstName} {client.user.lastName}
                  </option>
                ))}
              </select>
              {errors.clientId && <span className="mt-1 block text-xs text-red-600">{errors.clientId.message}</span>}
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Router / dispositivo de red
              <select {...register('deviceId')} className={inputClass} disabled={catalogosLoading}>
                <option value="">Selecciona un dispositivo</option>
                {dispositivos.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name} ({device.deviceType})
                  </option>
                ))}
              </select>
              {errors.deviceId && <span className="mt-1 block text-xs text-red-600">{errors.deviceId.message}</span>}
            </label>
          </div>

          {clientes.length === 0 && !catalogosLoading && !catalogosError && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              No hay clientes disponibles para instalación.
            </p>
          )}
          {dispositivos.length === 0 && !catalogosLoading && !catalogosError && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              Registra y activa un dispositivo de red antes de crear el acta.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Dirección MAC
              <input
                {...register('macAddress')}
                autoComplete="off"
                className={inputClass}
                placeholder="AA:BB:CC:DD:EE:FF"
                maxLength={17}
              />
              {errors.macAddress && <span className="mt-1 block text-xs text-red-600">{errors.macAddress.message}</span>}
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Dirección IP asignada
              <input
                {...register('ipAddress')}
                autoComplete="off"
                className={inputClass}
                inputMode="decimal"
                placeholder="192.168.10.25"
              />
              {errors.ipAddress && <span className="mt-1 block text-xs text-red-600">{errors.ipAddress.message}</span>}
            </label>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-800">
            <input
              {...register('aplicarCostosExtra')}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-unitik-600 focus:ring-unitik-500"
              type="checkbox"
            />
            <span>
              <span className="block font-semibold">Aplicar costos extra por cableado/equipamiento excedente</span>
              <span className="mt-1 block text-xs text-slate-600">
                La novedad quedará registrada para el flujo de facturación.
              </span>
            </span>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Observaciones de terreno
            <textarea
              {...register('observaciones')}
              className={`${inputClass} min-h-32 resize-y`}
              maxLength={2000}
              placeholder="Referencias de ubicación, condiciones del terreno o detalles de instalación…"
              rows={4}
            />
            {errors.observaciones && <span className="mt-1 block text-xs text-red-600">{errors.observaciones.message}</span>}
          </label>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={() => navigate('/tecnico/dashboard')}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting || catalogosLoading || clientes.length === 0 || dispositivos.length === 0}
              type="submit"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {isSubmitting ? 'Guardando acta…' : 'Guardar Acta'}
            </button>
          </div>
        </form>

        <div className="mt-6 flex gap-2 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
          <Info className="h-4 w-4 shrink-0 text-unitik-600" aria-hidden="true" />
          <p>
            La vinculación de esta IP/MAC registra el equipo y permite activar al cliente en el sistema. La
            configuración efectiva del RouterBoard y la factura dependen de la provisión PPPoE y del plan contratado.
          </p>
        </div>
      </section>
    </DashboardShell>
  );
}
