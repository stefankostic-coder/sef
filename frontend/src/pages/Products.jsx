import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { api } from '../utils/api.js';

function ProductsTable({ items, onDelete }) {
  const hasRows = items.length > 0;

  if (!hasRows) {
    return (
      <div className='rounded-xl border border-slate-200 bg-white p-8 text-center'>
        <p className='text-slate-600'>
          Još uvek nema artikala. Dodajte prvi artikal kroz formu iznad.
        </p>
      </div>
    );
  }

  return (
    <div className='rounded-xl border border-slate-200 bg-white overflow-x-auto'>
      <table className='w-full text-sm'>
        <thead>
          <tr className='text-left bg-slate-50 border-b border-slate-100'>
            <th className='px-4 py-3'>Šifra</th>
            <th className='px-4 py-3'>Naziv</th>
            <th className='px-4 py-3'>Vrsta materijala</th>
            <th className='px-4 py-3'>Kreirano</th>
            <th className='px-4 py-3'></th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id} className='border-t border-slate-100'>
              <td className='px-4 py-2 font-mono'>{p.code}</td>
              <td className='px-4 py-2'>{p.name}</td>
              <td className='px-4 py-2'>{p.material_type || '—'}</td>
              <td className='px-4 py-2 text-slate-500'>
                {new Date(p.created_at).toLocaleString()}
              </td>
              <td className='px-4 py-2 text-right'>
                <button
                  onClick={() => onDelete(p.id)}
                  className='rounded-lg bg-red-600 text-white px-3 py-1.5 hover:bg-red-700 transition'
                >
                  Obriši
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Products() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', material_type: '' });

  const load = async () => {
    try {
      setErr('');
      setLoading(true);
      const res = await api.listProducts();
      setItems(res.items || []);
    } catch (e) {
      setErr(e.message || 'Greška pri učitavanju artikala');
    } finally {
      setLoading(false);
    }
  };

  const onCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      setErr('Naziv i šifra su obavezni.');
      return;
    }
    try {
      setErr('');
      setSubmitting(true);
      await api.createProduct({
        name: form.name.trim(),
        code: form.code.trim(),
        material_type: form.material_type.trim() || undefined,
      });
      setForm({ name: '', code: '', material_type: '' });
      await load();
    } catch (e) {
      setErr(e.message || 'Greška pri kreiranju artikla');
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id) => {
    try {
      setErr('');
      await api.deleteProduct(id);
      await load();
    } catch (e) {
      setErr(e.message || 'Greška pri brisanju artikla');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className='min-h-dvh grid grid-rows-[auto_1fr_auto]'>
      <Navbar />
      <main className='container mx-auto py-8 space-y-6'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-semibold text-slate-900'>Artikli</h1>
        </div>

        {err && (
          <div className='rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
            {err}
          </div>
        )}

        {/* Forma za kreiranje */}
        <form
          onSubmit={onCreate}
          className='rounded-xl border border-slate-200 bg-white p-5 space-y-4'
        >
          <div className='grid gap-4 sm:grid-cols-3'>
            <label className='block'>
              <span className='mb-1.5 block text-sm font-medium text-slate-700'>
                Naziv *
              </span>
              <input
                type='text'
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className='w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none'
                placeholder='npr. Usluga'
                required
              />
            </label>

            <label className='block'>
              <span className='mb-1.5 block text-sm font-medium text-slate-700'>
                Šifra *
              </span>
              <input
                type='text'
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value }))
                }
                className='w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none font-mono'
                placeholder='npr. USL-001'
                required
              />
            </label>

            <label className='block'>
              <span className='mb-1.5 block text-sm font-medium text-slate-700'>
                Vrsta materijala (opciono)
              </span>
              <input
                type='text'
                value={form.material_type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, material_type: e.target.value }))
                }
                className='w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none'
                placeholder='usluga / materijal / transport…'
              />
            </label>
          </div>

          <div className='pt-1'>
            <button
              type='submit'
              disabled={submitting}
              className='inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition disabled:opacity-60'
            >
              {submitting ? 'Kreiranje…' : 'Dodaj artikal'}
            </button>
          </div>
        </form>

        {loading ? (
          <div className='text-slate-600'>Učitavanje…</div>
        ) : (
          <ProductsTable items={items} onDelete={onDelete} />
        )}
      </main>
      <Footer />
    </div>
  );
}
