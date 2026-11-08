import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError } from '../../api/http';
import { useClientesStore, type RegisterClientInput, type RegisteredClient } from '../../stores/clientes';

const clientSchema = z.object({
  documentId: z
    .string()
    .trim()
    .regex(/^\d{6,10}$/, 'La cédula debe tener entre 6 y 10 dígitos'),
  firstName: z.string().trim().min(1, 'Ingresa los nombres'),
  lastName: z.string().trim().min(1, 'Ingresa los apellidos'),
  email: z.string().trim().email('Ingresa un correo válido'),
  phone: z.string().trim().regex(/^3\d{9}$/, 'El celular debe tener 10 dígitos e iniciar en 3'),
  address: z.string().trim().min(5, 'Ingresa una dirección válida'),
  serviceType: z.enum(['FIBER', 'RADIO']),
  paymentModality: z.enum(['PREPAID', 'POSTPAID']),
});

type ClientFormValues = z.infer<typeof clientSchema>;

const inputClassName =
  'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-unitik-500 focus:outline-none focus:ring-2 focus:ring-unitik-100';

export default function FormularioNuevoCliente() {
  const registrarCliente = useClientesStore((state) => state.registrarCliente);
  const [createdClient, setCreatedClient] = useState<RegisteredClient | null>(null);
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: { serviceType: 'FIBER', paymentModality: 'POSTPAID' },
  });

  const submit = async (values: ClientFormValues) => {
    setServerError('');
    setCreatedClient(null);
    const clientInput: RegisterClientInput = {
      ...values,
      installationDate: new Date().toISOString().slice(0, 10),
    };
    try {
      const client = await registrarCliente(clientInput);
      setCreatedClient(client);
      reset({ serviceType: 'FIBER', paymentModality: 'POSTPAID' });
    } catch (error) {
      setServerError(
        error instanceof ApiError
          ? error.message
          : 'No fue posible guardar el cliente. Verifica la conexión con el servidor e inténtalo de nuevo.',
      );
    }
  };

  return (
    <section className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-unitik-600">
          Registro interno
        </p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">Registrar cliente</h2>
        <p className="mt-1 text-sm text-slate-500">
          Crea la cuenta base. El equipo técnico asignará el plan y los equipos durante la instalación.
        </p>
      </header>

      {createdClient && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">
          <p className="font-semibold">Cliente registrado correctamente en la base de datos.</p>
          <p className="mt-1">Código: {createdClient.clientCode}</p>
          <p className="mt-1">
            Acceso: documento <strong>{createdClient.user.documentId}</strong> como usuario y contraseña inicial.
          </p>
          <p className="mt-1">El usuario puede ingresar en /login. El plan se asignará posteriormente.</p>
        </div>
      )}

      <form className="space-y-5" noValidate onSubmit={handleSubmit(submit)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Documento de identidad
            <input
              {...register('documentId')}
              autoComplete="off"
              className={inputClassName}
              inputMode="numeric"
              maxLength={10}
              placeholder="1085123456"
            />
            {errors.documentId && <span className="mt-1 block text-xs text-red-600">{errors.documentId.message}</span>}
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Teléfono celular
            <input
              {...register('phone')}
              autoComplete="tel"
              className={inputClassName}
              inputMode="tel"
              placeholder="3151234567"
            />
            {errors.phone && <span className="mt-1 block text-xs text-red-600">{errors.phone.message}</span>}
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Nombres
            <input {...register('firstName')} autoComplete="given-name" className={inputClassName} />
            {errors.firstName && <span className="mt-1 block text-xs text-red-600">{errors.firstName.message}</span>}
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Apellidos
            <input {...register('lastName')} autoComplete="family-name" className={inputClassName} />
            {errors.lastName && <span className="mt-1 block text-xs text-red-600">{errors.lastName.message}</span>}
          </label>
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Correo electrónico
          <input {...register('email')} autoComplete="email" className={inputClassName} type="email" />
          {errors.email && <span className="mt-1 block text-xs text-red-600">{errors.email.message}</span>}
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Dirección del servicio
          <input {...register('address')} autoComplete="street-address" className={inputClassName} />
          {errors.address && <span className="mt-1 block text-xs text-red-600">{errors.address.message}</span>}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Tecnología solicitada
            <select {...register('serviceType')} className={inputClassName}>
              <option value="FIBER">Fibra Óptica</option>
              <option value="RADIO">Radio Enlace</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Modalidad de pago
            <select {...register('paymentModality')} className={inputClassName}>
              <option value="POSTPAID">Pospago</option>
              <option value="PREPAID">Prepago</option>
            </select>
          </label>
        </div>

        {serverError && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            {serverError}
          </p>
        )}

        <div>
          <button
            className="w-full rounded-lg bg-unitik-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-unitik-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Guardando cliente…' : 'Guardar cliente'}
          </button>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Nota: Al guardar, se generará el acceso del cliente utilizando su documento como contraseña por defecto. El plan y la IP se asignarán posteriormente en el Acta de Instalación.
          </p>
        </div>
      </form>
    </section>
  );
}
