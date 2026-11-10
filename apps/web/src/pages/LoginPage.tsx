import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { api, apiUrl } from '../api/http';
import BrandLogo from '../components/BrandLogo';
import { ROLE_DASHBOARD_PATHS, useAuthStore, type SessionUser } from '../stores/auth';
import { DEMO_ACCOUNTS, demoSession, isDemoMode } from '../api/demo';

interface LoginResponse {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
}

const loginSchema = z.object({
  identifier: z.string().min(1, 'Ingrese su correo o número de cédula'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((state) => state.setSession);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (form: LoginForm) => {
    setServerError('');
    if (isDemoMode()) {
      try {
        const data = await api<LoginResponse>('/auth/login', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        setSession(data.user, data.accessToken, data.refreshToken);
        navigate(ROLE_DASHBOARD_PATHS[data.user.role], { replace: true });
      } catch (error) {
        setServerError(error instanceof Error ? error.message : 'No fue posible iniciar la demo.');
      }
      return;
    }

    try {
      const response = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        setServerError(
          response.status === 401
            ? 'Credenciales incorrectas o cuenta no registrada. El personal autorizado debe crear la cuenta del cliente.'
            : 'No fue posible iniciar sesión. Intente de nuevo.',
        );
        return;
      }
      const data = (await response.json()) as LoginResponse;
      setSession(data.user, data.accessToken, data.refreshToken);
      const requestedPath = (location.state as { from?: { pathname?: string } } | null)?.from
        ?.pathname;
      const canRegisterClients = data.user.role === 'ADMIN' || data.user.role === 'TECHNICIAN';
      const registrationPath =
        canRegisterClients && (requestedPath === '/registro' || requestedPath === '/clientes/nuevo')
          ? requestedPath
          : null;
      navigate(registrationPath ?? ROLE_DASHBOARD_PATHS[data.user.role], { replace: true });
    } catch {
      setServerError(
        'No se pudo conectar con el servidor. Verifica que el backend esté disponible.',
      );
    }
  };

  const enterDemo = (role: (typeof DEMO_ACCOUNTS)[number]['role']) => {
    const data = demoSession(role);
    setSession(data.user, data.accessToken, data.refreshToken);
    navigate(ROLE_DASHBOARD_PATHS[role], { replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
        <div className="mb-6 flex justify-center">
          <BrandLogo className="h-40 w-auto" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {isDemoMode() && (
            <section
              aria-label="Acceso a la demo"
              className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3"
            >
              <p className="text-xs font-semibold text-amber-900">
                Acceso de demostración · elige un perfil
              </p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map(({ role, name }) => (
                  <button
                    className="rounded-md border border-amber-300 bg-white px-2 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                    key={role}
                    onClick={() => enterDemo(role)}
                    type="button"
                  >
                    Entrar como {name}
                  </button>
                ))}
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                Los datos son simulados y se guardan solo en este navegador. No uses información
                real.
              </p>
            </section>
          )}
          <div>
            <label htmlFor="identifier" className="mb-1 block text-sm font-medium text-slate-700">
              Correo o cédula
            </label>
            <input
              id="identifier"
              type="text"
              autoComplete="username"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-unitik-500 focus:outline-none"
              {...register('identifier')}
            />
            {errors.identifier && (
              <p className="mt-1 text-xs text-red-600">{errors.identifier.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-unitik-500 focus:outline-none"
              {...register('password')}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          {serverError && <p className="text-sm text-red-600">{serverError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-unitik-600 py-2 text-sm font-semibold text-white transition hover:bg-unitik-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-slate-500">
          <p>
            Los clientes ingresan con su correo o documento y pueden crear una cuenta desde aquí.
          </p>
          <Link
            to="/registro"
            className="mt-3 inline-flex rounded-lg border border-unitik-200 px-4 py-2 font-semibold text-unitik-700 transition hover:bg-unitik-50"
          >
            Crear cuenta de cliente
          </Link>
          <p className="mt-1">Regístrate para acceder al portal del cliente.</p>
        </div>
      </div>
    </main>
  );
}
