import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { api } from '../api/http';
import BrandLogo from '../components/BrandLogo';
import { ROLE_DASHBOARD_PATHS, useAuthStore, type SessionUser } from '../stores/auth';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Ingresa tu contraseña actual'),
    newPassword: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .max(72, 'Máximo 72 caracteres')
      .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Combina letras y números'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ['newPassword'],
    message: 'Debe ser distinta de la contraseña actual',
  });

type FormValues = z.infer<typeof schema>;

interface LoginResponse {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
}

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-unitik-500 focus:outline-none focus:ring-2 focus:ring-unitik-100';

/**
 * HU-01: clients created by UNITIK start with their document number as
 * password and must replace it before using the portal.
 */
export default function CambiarContrasenaPage() {
  const navigate = useNavigate();
  const { user, setSession } = useAuthStore();
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (!user) return <Navigate to="/login" replace />;

  const submit = async (values: FormValues) => {
    setServerError('');
    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });
      // Changing the password revokes the previous session: sign in again.
      const session = await api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: user.email, password: values.newPassword }),
      });
      setSession(session.user, session.accessToken, session.refreshToken);
      navigate(ROLE_DASHBOARD_PATHS[session.user.role], { replace: true });
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'No se pudo cambiar la contraseña.');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200 sm:p-8">
        <div className="mb-5 flex justify-center">
          <BrandLogo className="h-24 w-auto" alt="UNITIK Internet Sin Límite" />
        </div>
        <h1 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <KeyRound className="h-5 w-5 text-unitik-600" aria-hidden="true" />
          Crea tu contraseña
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Hola {user.firstName}. Por seguridad, reemplaza la contraseña inicial (tu número de
          documento) antes de continuar.
        </p>

        <form onSubmit={handleSubmit(submit)} noValidate className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Contraseña actual
            <input
              type="password"
              autoComplete="current-password"
              className={inputClass}
              {...register('currentPassword')}
            />
            {errors.currentPassword && (
              <span className="mt-1 block text-xs text-red-600">
                {errors.currentPassword.message}
              </span>
            )}
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Nueva contraseña
            <input
              type="password"
              autoComplete="new-password"
              className={inputClass}
              {...register('newPassword')}
            />
            <span className="mt-1 block text-xs text-slate-500">
              Mínimo 8 caracteres con letras y números.
            </span>
            {errors.newPassword && (
              <span className="mt-1 block text-xs text-red-600">{errors.newPassword.message}</span>
            )}
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Confirmar nueva contraseña
            <input
              type="password"
              autoComplete="new-password"
              className={inputClass}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <span className="mt-1 block text-xs text-red-600">
                {errors.confirmPassword.message}
              </span>
            )}
          </label>

          {serverError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-unitik-600 px-4 text-sm font-semibold text-white hover:bg-unitik-700 disabled:opacity-50"
          >
            {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Guardar y continuar
          </button>
        </form>
      </div>
    </main>
  );
}
