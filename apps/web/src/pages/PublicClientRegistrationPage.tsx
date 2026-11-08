import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { api, ApiError } from '../api/http';
import BrandLogo from '../components/BrandLogo';
import { useAuthStore, type SessionUser } from '../stores/auth';
import type { RegisteredClient } from '../stores/clientes';

interface LoginResponse {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
}

const registrationSchema = z
  .object({
    documentId: z.string().trim().regex(/^\d{6,10}$/, 'La cédula debe tener entre 6 y 10 dígitos'),
    firstName: z.string().trim().min(1, 'Ingresa tus nombres').max(100),
    lastName: z.string().trim().min(1, 'Ingresa tus apellidos').max(100),
    email: z.string().trim().email('Ingresa un correo válido').max(254),
    phone: z.string().trim().regex(/^3\d{9}$/, 'El celular debe tener 10 dígitos e iniciar en 3'),
    address: z.string().trim().min(5, 'Ingresa una dirección válida').max(255),
    serviceType: z.enum(['FIBER', 'RADIO']),
    paymentModality: z.enum(['PREPAID', 'POSTPAID']),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72),
    passwordConfirmation: z.string(),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: 'Las contraseñas no coinciden',
    path: ['passwordConfirmation'],
  });

type RegistrationForm = z.infer<typeof registrationSchema>;

const inputClassName =
  'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-unitik-500 focus:outline-none focus:ring-2 focus:ring-unitik-100';

export default function PublicClientRegistrationPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const [createdClient, setCreatedClient] = useState<RegisteredClient | null>(null);
  const [serverError, setServerError] = useState('');
  const [loginError, setLoginError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { serviceType: 'FIBER', paymentModality: 'POSTPAID' },
  });

  const submit = async (formValues: RegistrationForm) => {
    setServerError('');
    setLoginError('');

    const values = {
      documentId: formValues.documentId,
      firstName: formValues.firstName,
      lastName: formValues.lastName,
      email: formValues.email,
      phone: formValues.phone,
      address: formValues.address,
      serviceType: formValues.serviceType,
      paymentModality: formValues.paymentModality,
      password: formValues.password,
    };

    let client: RegisteredClient;
    try {
      client = await api<RegisteredClient>('/clients/register', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      setCreatedClient(client);
    } catch (error) {
      setServerError(
        error instanceof ApiError
          ? error.message
          : 'No fue posible crear la cuenta. Verifica tu conexión e inténtalo nuevamente.',
      );
      return;
    }

    try {
      const session = await api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: values.documentId, password: values.password }),
      });
      setSession(session.user, session.accessToken, session.refreshToken);
      navigate('/cliente/portal', { replace: true });
    } catch {
      setLoginError('Tu cuenta fue creada. Inicia sesión con tu documento y la contraseña que elegiste.');
    }
  };

  if (createdClient && loginError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <section className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mb-6 flex justify-center">
            <BrandLogo className="h-28 w-auto" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Cuenta creada correctamente</h1>
          <p className="mt-3 text-sm text-slate-600">{loginError}</p>
          <p className="mt-2 text-sm text-slate-600">
            Tu código de cliente es <strong>{createdClient.clientCode}</strong>. El plan se asignará
            durante la instalación.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex rounded-lg bg-unitik-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-unitik-700"
          >
            Ir a iniciar sesión
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-6 shadow-lg md:p-8">
        <div className="mb-5 flex justify-center">
          <BrandLogo className="h-28 w-auto" />
        </div>
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Crea tu cuenta de cliente</h1>
          <p className="mt-2 text-sm text-slate-600">
            Regístrate para acceder al portal. El plan y los equipos se asignarán posteriormente
            durante la instalación.
          </p>
        </header>

        <form className="space-y-5" noValidate onSubmit={handleSubmit(submit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Documento de identidad
              <input {...register('documentId')} className={inputClassName} inputMode="numeric" maxLength={10} />
              {errors.documentId && <span className="mt-1 block text-xs text-red-600">{errors.documentId.message}</span>}
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Celular
              <input {...register('phone')} className={inputClassName} autoComplete="tel" inputMode="tel" />
              {errors.phone && <span className="mt-1 block text-xs text-red-600">{errors.phone.message}</span>}
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Nombres
              <input {...register('firstName')} className={inputClassName} autoComplete="given-name" />
              {errors.firstName && <span className="mt-1 block text-xs text-red-600">{errors.firstName.message}</span>}
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Apellidos
              <input {...register('lastName')} className={inputClassName} autoComplete="family-name" />
              {errors.lastName && <span className="mt-1 block text-xs text-red-600">{errors.lastName.message}</span>}
            </label>
          </div>

          <label className="block text-sm font-medium text-slate-700">
            Correo electrónico
            <input {...register('email')} className={inputClassName} autoComplete="email" type="email" />
            {errors.email && <span className="mt-1 block text-xs text-red-600">{errors.email.message}</span>}
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Dirección del servicio
            <input {...register('address')} className={inputClassName} autoComplete="street-address" />
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

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Contraseña
              <input
                {...register('password')}
                className={inputClassName}
                autoComplete="new-password"
                type="password"
              />
              {errors.password && <span className="mt-1 block text-xs text-red-600">{errors.password.message}</span>}
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Confirmar contraseña
              <input
                {...register('passwordConfirmation')}
                className={inputClassName}
                autoComplete="new-password"
                type="password"
              />
              {errors.passwordConfirmation && (
                <span className="mt-1 block text-xs text-red-600">{errors.passwordConfirmation.message}</span>
              )}
            </label>
          </div>

          {serverError && (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
              {serverError}
            </p>
          )}

          <button
            className="w-full rounded-lg bg-unitik-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-unitik-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600">
          ¿Ya tienes cuenta?{' '}
          <Link className="font-semibold text-unitik-700 hover:underline" to="/login">
            Inicia sesión
          </Link>
        </p>
      </section>
    </main>
  );
}
