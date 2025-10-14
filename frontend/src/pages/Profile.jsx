import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { api } from '../utils/api.js';

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [user, setUser] = useState(null);

  const [name, setName] = useState('');
  const [pib, setPib] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const load = async () => {
    try {
      setErr('');
      setOk('');
      setLoading(true);
      const res = await api.getMyProfile();
      setUser(res.user);
      setName(res.user.name || '');
      setPib(res.user.pib || '');
    } catch (e) {
      setErr(e.message || 'Greška pri učitavanju profila');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSave = async (e) => {
    e.preventDefault();
    setErr('');
    setOk('');

    // validacije
    if (user?.role === 'company' && pib && !/^\d{9}$/.test(pib)) {
      setErr('PIB mora imati tačno 9 cifara.');
      return;
    }
    if (
      (currentPassword && !newPassword) ||
      (!currentPassword && newPassword)
    ) {
      setErr('Za promenu lozinke popunite i staru i novu lozinku.');
      return;
    }

    const payload = {};
    if (name.trim() && name.trim() !== user?.name) payload.name = name.trim();
    if (user?.role === 'company') payload.pib = pib ? pib.trim() : null;
    if (currentPassword && newPassword) {
      payload.change_password = {
        current_password: currentPassword,
        new_password: newPassword,
      };
    }

    try {
      const res = await api.updateMyProfile(payload);
      setUser(res.user);
      setOk('Profil je uspešno ažuriran.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (e) {
      setErr(e.message || 'Greška pri snimanju profila');
    }
  };

  return (
    <div className='min-h-dvh grid grid-rows-[auto_1fr_auto]'>
      <Navbar />
      <main className='container mx-auto py-8'>
        <div className='mx-auto max-w-2xl space-y-6'>
          <h1 className='text-2xl font-semibold text-slate-900'>Moj profil</h1>

          {err && (
            <div className='rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
              {err}
            </div>
          )}
          {ok && (
            <div className='rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700'>
              {ok}
            </div>
          )}

          {loading ? (
            <div className='text-slate-600'>Učitavanje…</div>
          ) : (
            <form onSubmit={onSave} className='space-y-6'>
              <div className='rounded-xl border border-slate-200 bg-white p-5 space-y-4'>
                <div className='grid gap-4 sm:grid-cols-2'>
                  <label className='block'>
                    <span className='mb-1 block text-sm font-medium text-slate-700'>
                      Ime i prezime / Naziv
                    </span>
                    <input
                      className='w-full rounded-lg border border-slate-300 px-3 py-2'
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder='Ime...'
                    />
                  </label>

                  <label className='block'>
                    <span className='mb-1 block text-sm font-medium text-slate-700'>
                      Email (read-only)
                    </span>
                    <input
                      className='w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2'
                      value={user?.email || ''}
                      readOnly
                    />
                  </label>

                  {user?.role === 'company' && (
                    <label className='block'>
                      <span className='mb-1 block text-sm font-medium text-slate-700'>
                        PIB (9 cifara)
                      </span>
                      <input
                        className='w-full rounded-lg border border-slate-300 px-3 py-2'
                        value={pib}
                        onChange={(e) => setPib(e.target.value)}
                        inputMode='numeric'
                        placeholder='123456789'
                      />
                      <div className='mt-1 text-xs text-slate-500'>
                        {user?.verified
                          ? 'Vaš nalog je verifikovan.'
                          : 'Nalog nije verifikovan.'}
                      </div>
                    </label>
                  )}
                </div>
              </div>

              <div className='rounded-xl border border-slate-200 bg-white p-5 space-y-4'>
                <h2 className='font-medium text-slate-900'>Promena lozinke</h2>
                <div className='grid gap-4 sm:grid-cols-2'>
                  <label className='block'>
                    <span className='mb-1 block text-sm font-medium text-slate-700'>
                      Trenutna lozinka
                    </span>
                    <input
                      type='password'
                      className='w-full rounded-lg border border-slate-300 px-3 py-2'
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </label>
                  <label className='block'>
                    <span className='mb-1 block text-sm font-medium text-slate-700'>
                      Nova lozinka
                    </span>
                    <input
                      type='password'
                      className='w-full rounded-lg border border-slate-300 px-3 py-2'
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder='min. 6 karaktera'
                    />
                  </label>
                </div>
              </div>

              <div className='flex items-center justify-end gap-3'>
                <button
                  type='submit'
                  className='rounded-lg bg-indigo-600 text-white px-5 py-2 text-sm font-medium hover:bg-indigo-700 transition'
                >
                  Sačuvaj izmene
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
