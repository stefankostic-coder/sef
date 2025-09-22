import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Mail, Lock, LogIn } from 'lucide-react';

export default function Login() {
  const { login, setError, error } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(form.email, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Prijava neuspešna');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className='min-h-dvh grid grid-rows-[1fr_auto]'>
      {/* eksplicitno centriranje po X i Y osi bez ikakvog temiranja */}
      <main className='w-full px-4 py-14 flex items-center justify-center'>
        <div className='w-full max-w-md mx-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-lg'>
          <div className='mb-6 text-center space-y-1'>
            <h1 className='text-3xl font-bold text-slate-900'>Prijava</h1>
            <p className='text-sm text-slate-600'>Ulogujte se na nalog</p>
          </div>

          {error ? (
            <div className='mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
              {error}
            </div>
          ) : null}

          <form className='space-y-4' onSubmit={onSubmit}>
            <label className='block'>
              <span className='mb-1.5 block text-sm font-medium text-slate-700'>
                Email
              </span>
              <div className='flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 focus-within:ring-2 focus-within:ring-indigo-500 transition'>
                <Mail className='h-4 w-4 text-slate-500' />
                <input
                  type='email'
                  required
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  className='w-full py-2.5 outline-none bg-transparent'
                  placeholder='you@company.com'
                />
              </div>
            </label>

            <label className='block'>
              <span className='mb-1.5 block text-sm font-medium text-slate-700'>
                Lozinka
              </span>
              <div className='flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 focus-within:ring-2 focus-within:ring-indigo-500 transition'>
                <Lock className='h-4 w-4 text-slate-500' />
                <input
                  type='password'
                  required
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  className='w-full py-2.5 outline-none bg-transparent'
                  placeholder='••••••••'
                />
              </div>
            </label>

            <button
              type='submit'
              disabled={submitting}
              className='inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700 active:scale-[.99] transition disabled:opacity-60'
            >
              <LogIn className='h-4 w-4' />
              {submitting ? 'Prijavljivanje…' : 'Prijavi se'}
            </button>
          </form>

          <p className='mt-5 text-center text-sm text-slate-600'>
            Nemate nalog?{' '}
            <Link
              className='text-indigo-600 font-medium hover:underline underline-offset-2'
              to='/register'
            >
              Registrujte se
            </Link>
          </p>
        </div>
      </main>

      <footer className='py-6 text-center text-sm text-slate-600'>
        © {new Date().getFullYear()} SEF e-Fakture • Demo
      </footer>
    </div>
  );
}
