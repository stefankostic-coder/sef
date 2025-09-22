import { useState, useMemo } from 'react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { api } from '../utils/api.js';
import { useNavigate } from 'react-router-dom';

function ItemRow({ idx, item, onChange, onRemove }) {
  return (
    <div className='grid grid-cols-1 sm:grid-cols-12 gap-3 items-end'>
      <div className='sm:col-span-4'>
        <label className='block text-sm mb-1 text-slate-700'>
          Naziv stavke
        </label>
        <input
          className='w-full rounded-lg border border-slate-300 px-3 py-2'
          value={item.name}
          onChange={(e) => onChange(idx, { ...item, name: e.target.value })}
          placeholder='Usluga / Proizvod'
          required
        />
      </div>
      <div className='sm:col-span-2'>
        <label className='block text-sm mb-1 text-slate-700'>Količina</label>
        <input
          type='number'
          min='0'
          step='1'
          className='w-full rounded-lg border border-slate-300 px-3 py-2'
          value={item.qty}
          onChange={(e) =>
            onChange(idx, { ...item, qty: Number(e.target.value) })
          }
          required
        />
      </div>
      <div className='sm:col-span-3'>
        <label className='block text-sm mb-1 text-slate-700'>Cena</label>
        <input
          type='number'
          min='0'
          step='0.01'
          className='w-full rounded-lg border border-slate-300 px-3 py-2'
          value={item.price}
          onChange={(e) =>
            onChange(idx, { ...item, price: Number(e.target.value) })
          }
          required
        />
      </div>
      <div className='sm:col-span-2'>
        <label className='block text-sm mb-1 text-slate-700'>Porez</label>
        <input
          type='number'
          min='0'
          step='0.01'
          className='w-full rounded-lg border border-slate-300 px-3 py-2'
          value={item.taxRate}
          onChange={(e) =>
            onChange(idx, { ...item, taxRate: Number(e.target.value) })
          }
          placeholder='npr. 0.2'
        />
      </div>
      <div className='sm:col-span-1'>
        <button
          type='button'
          onClick={() => onRemove(idx)}
          className='w-full rounded-lg bg-red-600 text-white px-3 py-2 hover:bg-red-700 transition'
        >
          X
        </button>
      </div>
    </div>
  );
}

export default function CreateInvoice() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    number: '',
    issue_date: '',
    due_date: '',
    recipient_pib: '',
    currency: 'RSD',
    status: 'draft',
    note: '',
  });
  const [items, setItems] = useState([
    { name: '', qty: 1, price: 0, taxRate: 0 },
  ]);

  const total = useMemo(() => {
    return items.reduce((sum, i) => {
      const qty = Number(i.qty) || 0;
      const price = Number(i.price) || 0;
      const tax = Number(i.taxRate) || 0;
      return sum + qty * price * (1 + tax);
    }, 0);
  }, [items]);

  const changeItem = (idx, next) => {
    setItems((arr) => arr.map((it, i) => (i === idx ? next : it)));
  };
  const removeItem = (idx) => {
    setItems((arr) => arr.filter((_, i) => i !== idx));
  };
  const addItem = () => {
    setItems((arr) => [...arr, { name: '', qty: 1, price: 0, taxRate: 0 }]);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        number: form.number.trim(),
        issue_date: form.issue_date, // YYYY-MM-DD
        due_date: form.due_date || null,
        currency: form.currency,
        total_amount: Number(total.toFixed(2)),
        recipient_pib: form.recipient_pib.trim(),
        status: form.status,
        items,
        note: form.note?.trim() || null,
      };
      await api.createInvoice(payload);
      navigate('/invoices', { replace: true });
    } catch (e2) {
      setError(e2.message || 'Greška pri kreiranju fakture');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className='min-h-dvh grid grid-rows-[auto_1fr_auto]'>
      <Navbar />
      <main className='container mx-auto py-8'>
        <div className='mx-auto max-w-3xl space-y-6'>
          <div className='flex items-center justify-between'>
            <h1 className='text-2xl font-semibold text-slate-900'>
              Nova faktura
            </h1>
            <a
              href='/invoices'
              className='text-sm text-indigo-600 hover:underline'
            >
              Nazad na fakture
            </a>
          </div>

          {error && (
            <div className='rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
              {error}
            </div>
          )}

          <form className='space-y-6' onSubmit={onSubmit}>
            {/* Osnovni podaci */}
            <div className='rounded-xl border border-slate-200 bg-white p-5'>
              <div className='grid sm:grid-cols-2 gap-4'>
                <label className='block'>
                  <span className='mb-1 block text-sm font-medium text-slate-700'>
                    Broj fakture
                  </span>
                  <input
                    className='w-full rounded-lg border border-slate-300 px-3 py-2'
                    value={form.number}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, number: e.target.value }))
                    }
                    required
                    placeholder='npr. 100000001-INV-2025-001'
                  />
                </label>

                <label className='block'>
                  <span className='mb-1 block text-sm font-medium text-slate-700'>
                    PIB komitenta
                  </span>
                  <input
                    className='w-full rounded-lg border border-slate-300 px-3 py-2'
                    value={form.recipient_pib}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, recipient_pib: e.target.value }))
                    }
                    required
                    inputMode='numeric'
                    pattern='\d{9}'
                    title='9 cifara'
                    placeholder='123456789'
                  />
                </label>

                <label className='block'>
                  <span className='mb-1 block text-sm font-medium text-slate-700'>
                    Datum izdavanja
                  </span>
                  <input
                    type='date'
                    className='w-full rounded-lg border border-slate-300 px-3 py-2'
                    value={form.issue_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, issue_date: e.target.value }))
                    }
                    required
                  />
                </label>

                <label className='block'>
                  <span className='mb-1 block text-sm font-medium text-slate-700'>
                    Rok plaćanja
                  </span>
                  <input
                    type='date'
                    className='w-full rounded-lg border border-slate-300 px-3 py-2'
                    value={form.due_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, due_date: e.target.value }))
                    }
                  />
                </label>

                <label className='block'>
                  <span className='mb-1 block text-sm font-medium text-slate-700'>
                    Valuta
                  </span>
                  <select
                    className='w-full rounded-lg border border-slate-300 px-3 py-2'
                    value={form.currency}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, currency: e.target.value }))
                    }
                  >
                    <option value='RSD'>RSD</option>
                    <option value='EUR'>EUR</option>
                    <option value='USD'>USD</option>
                  </select>
                </label>

                <label className='block'>
                  <span className='mb-1 block text-sm font-medium text-slate-700'>
                    Status
                  </span>
                  <select
                    className='w-full rounded-lg border border-slate-300 px-3 py-2'
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value }))
                    }
                  >
                    <option value='draft'>draft</option>
                    <option value='sent'>sent</option>
                    {/* napomena: backend za company neće dozvoliti paid/cancelled na kreiranju */}
                  </select>
                </label>
              </div>

              <label className='block mt-4'>
                <span className='mb-1 block text-sm font-medium text-slate-700'>
                  Napomena
                </span>
                <textarea
                  className='w-full rounded-lg border border-slate-300 px-3 py-2'
                  rows={3}
                  value={form.note}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, note: e.target.value }))
                  }
                  placeholder='Opciona napomena'
                />
              </label>
            </div>

            {/* Stavke */}
            <div className='rounded-xl border border-slate-200 bg-white p-5 space-y-4'>
              <div className='flex items-center justify-between'>
                <h2 className='font-medium text-slate-900'>Stavke</h2>
                <button
                  type='button'
                  onClick={addItem}
                  className='rounded-lg bg-slate-900 text-white px-3 py-1.5 text-sm hover:bg-black transition'
                >
                  + Dodaj stavku
                </button>
              </div>

              <div className='space-y-4'>
                {items.map((it, idx) => (
                  <ItemRow
                    key={idx}
                    idx={idx}
                    item={it}
                    onChange={changeItem}
                    onRemove={removeItem}
                  />
                ))}
              </div>

              <div className='flex items-center justify-end gap-3 pt-2'>
                <div className='text-sm text-slate-600'>Ukupno:</div>
                <div className='text-lg font-semibold text-slate-900'>
                  {total.toFixed(2)} {form.currency}
                </div>
              </div>
            </div>

            <div className='flex items-center justify-end gap-3'>
              <a
                href='/invoices'
                className='rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50'
              >
                Otkaži
              </a>
              <button
                type='submit'
                disabled={submitting}
                className='rounded-lg bg-indigo-600 text-white px-5 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition'
              >
                {submitting ? 'Kreiranje…' : 'Kreiraj fakturu'}
              </button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
