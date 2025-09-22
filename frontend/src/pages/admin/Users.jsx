import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar.jsx';
import Footer from '../../components/Footer.jsx';
import { api } from '../../utils/api.js';

export default function AdminUsers() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      setErr('');
      setLoading(true);
      const res = await api.adminListUsers();
      setItems(res.items || []);
    } catch (e) {
      setErr(e.message || 'Greška pri učitavanju korisnika');
    } finally {
      setLoading(false);
    }
  };

  const toggleVerify = async (u) => {
    try {
      await api.adminVerifyUser(u.id, !u.verified);
      await load();
    } catch (e) {
      setErr(e.message || 'Greška pri verifikaciji');
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className='min-h-dvh grid grid-rows-[auto_1fr_auto]'>
      <Navbar />
      <main className='container mx-auto py-8'>
        <h1 className='text-2xl font-semibold text-slate-900 mb-4'>
          Admin • Korisnici
        </h1>

        {err && (
          <div className='mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
            {err}
          </div>
        )}

        {loading ? (
          <div className='text-slate-600'>Učitavanje…</div>
        ) : (
          <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white'>
            <table className='w-full text-sm'>
              <thead className='bg-slate-50'>
                <tr className='text-left'>
                  <th className='px-4 py-3'>ID</th>
                  <th className='px-4 py-3'>Naziv</th>
                  <th className='px-4 py-3'>Email</th>
                  <th className='px-4 py-3'>PIB</th>
                  <th className='px-4 py-3'>Uloga</th>
                  <th className='px-4 py-3'>Verifikovan</th>
                  <th className='px-4 py-3'></th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id} className='border-t border-slate-100'>
                    <td className='px-4 py-2'>{u.id}</td>
                    <td className='px-4 py-2'>{u.name}</td>
                    <td className='px-4 py-2'>{u.email}</td>
                    <td className='px-4 py-2'>{u.pib || '-'}</td>
                    <td className='px-4 py-2 uppercase text-slate-600'>
                      {u.role}
                    </td>
                    <td className='px-4 py-2'>
                      {u.role === 'company' ? (
                        <span
                          className={
                            u.verified ? 'text-green-600' : 'text-amber-600'
                          }
                        >
                          {u.verified ? 'DA' : 'NE'}
                        </span>
                      ) : (
                        <span className='text-slate-500'>-</span>
                      )}
                    </td>
                    <td className='px-4 py-2'>
                      {u.role === 'company' && (
                        <button
                          onClick={() => toggleVerify(u)}
                          className='rounded-lg bg-indigo-600 text-white px-3 py-1.5 hover:bg-indigo-700 transition'
                        >
                          {u.verified ? 'Poništi' : 'Verifikuj'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td
                      className='px-4 py-6 text-center text-slate-600'
                      colSpan={7}
                    >
                      Nema korisnika.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
