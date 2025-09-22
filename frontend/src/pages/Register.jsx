import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { User, Mail, Lock, Building2, UserPlus } from 'lucide-react';

export default function Register() {
  const { register, setError, error } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'company',
    pib: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const isCompany = form.role === 'company';

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        ...(isCompany ? { pib: form.pib } : {}),
      };
      await register(payload);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Registracija neuspešna');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className='min-h-dvh grid grid-rows-[1fr_auto]'>
      {/* eksplicitno centriranje po X i Y osi */}
      <main className='w-full px-4 py-14 flex items-center justify-center'>
        <div className='w-full max-w-md mx-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-lg'>
          <div className='mb-6 text-center space-y-1'>
            <h1 className='text-3xl font-bold text-slate-900'>Registracija</h1>
            <p className='text-sm text-slate-600'>Kreirajte nalog</p>
          </div>

          {error ? (
            <div className='mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
              {error}
            </div>
          ) : null}

          <form className='space-y-4' onSubmit={onSubmit}>
            <label className='block'>
              <span className='mb-1.5 block text-sm font-medium text-slate-700'>
                Naziv
              </span>
              <div className='flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 focus-within:ring-2 focus-within:ring-indigo-500 transition'>
                <User className='h-4 w-4 text-slate-500' />
                <input
                  type='text'
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className='w-full py-2.5 outline-none bg-transparent'
                  placeholder='Naziv kompanije ili ime'
                />
              </div>
            </label>

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

            <label className='block'>
              <span className='mb-1.5 block text-sm font-medium text-slate-700'>
                Uloga
              </span>
              <select
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({ ...f, role: e.target.value }))
                }
                className='w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus:ring-2 focus:ring-indigo-500'
              >
                <option value='company'>Company</option>
                <option value='admin'>Admin</option>
              </select>
              <p className='mt-1 text-xs text-slate-500'>
                Company nalozi zahtevaju verifikaciju od strane administratora.
              </p>
            </label>

            {isCompany && (
              <label className='block'>
                <span className='mb-1.5 block text-sm font-medium text-slate-700'>
                  PIB (9 cifara)
                </span>
                <div className='flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 focus-within:ring-2 focus-within:ring-indigo-500 transition'>
                  <Building2 className='h-4 w-4 text-slate-500' />
                  <input
                    type='text'
                    inputMode='numeric'
                    pattern='\d{9}'
                    title='9 cifara'
                    required={isCompany}
                    value={form.pib}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, pib: e.target.value }))
                    }
                    className='w-full py-2.5 outline-none bg-transparent'
                    placeholder='123456789'
                  />
                </div>
                <p className='mt-1 text-xs text-slate-500'>
                  Unesite tačan PIB kompanije radi validacije.
                </p>
              </label>
            )}

            <button
              type='submit'
              disabled={submitting}
              className='inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700 active:scale-[.99] transition disabled:opacity-60'
            >
              <UserPlus className='h-4 w-4' />
              {submitting ? 'Kreiranje naloga…' : 'Registruj se'}
            </button>
          </form>

          <p className='mt-5 text-center text-sm text-slate-600'>
            Već imate nalog?{' '}
            <Link
              className='text-indigo-600 font-medium hover:underline underline-offset-2'
              to='/login'
            >
              Prijavite se
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
