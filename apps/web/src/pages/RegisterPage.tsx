import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate('/login', { state: { registered: true, email: form.email } });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
        <div className="mb-6 flex justify-center">
          <BrandLogo className="h-32 w-auto" />
        </div>

        <h1 className="mb-2 text-center text-2xl font-bold text-slate-900">Crear cuenta</h1>
        <p className="mb-6 text-center text-sm text-slate-500">Registro inicial del portal Unitik-Cob</p>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-slate-700">
              <span className="mb-1 block font-medium">Nombres</span>
              <input
                value={form.firstName}
                onChange={(e) => setForm((current) => ({ ...current, firstName: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-unitik-500 focus:outline-none"
                placeholder="Nombre"
                required
              />
            </label>
            <label className="block text-sm text-slate-700">
              <span className="mb-1 block font-medium">Apellidos</span>
              <input
                value={form.lastName}
                onChange={(e) => setForm((current) => ({ ...current, lastName: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-unitik-500 focus:outline-none"
                placeholder="Apellido"
                required
              />
            </label>
          </div>

          <label className="block text-sm text-slate-700">
            <span className="mb-1 block font-medium">Correo</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-unitik-500 focus:outline-none"
              placeholder="usuario@unitik.com"
              required
            />
          </label>

          <label className="block text-sm text-slate-700">
            <span className="mb-1 block font-medium">Contraseña</span>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-unitik-500 focus:outline-none"
              placeholder="••••••••"
              required
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-lg bg-unitik-600 px-4 py-2.5 font-semibold text-white transition hover:bg-unitik-700"
          >
            Registrarse
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-unitik-600 hover:text-unitik-700">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
