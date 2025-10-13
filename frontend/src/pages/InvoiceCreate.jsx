import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { api } from '../utils/api.js';
import { useNavigate } from 'react-router-dom';

const TAX_OPTIONS = [0, 10, 20];

function num(n, d = 2) {
  const v = Number(n || 0);
  return isFinite(v) ? v.toFixed(d) : (0).toFixed(d);
}

function ItemRow({ idx, item, onChange, onRemove, products }) {
  const selectedProduct =
    products.find((p) => p.id === Number(item.productId)) || null;

  const unitWithVat = useMemo(
    () => Number(item.unit_price || 0) * (1 + Number(item.tax_rate || 0) / 100),
    [item.unit_price, item.tax_rate]
  );
  const lineTotal = useMemo(
    () => Number(item.qty || 0) * Number(item.unit_price || 0),
    [item.qty, item.unit_price]
  );
  const lineTotalWithVat = useMemo(
    () => Number(item.qty || 0) * unitWithVat,
    [item.qty, unitWithVat]
  );

  return (
    <div className='grid grid-cols-1 sm:grid-cols-12 gap-3 items-end'>
      {/* Product select */}
      <div className='sm:col-span-4'>
        <label className='block text-sm mb-1 text-slate-700'>Artikal *</label>
        <select
          className='w-full rounded-lg border border-slate-300 px-3 py-2'
          value={item.productId ?? ''}
          onChange={(e) => {
            const pid = e.target.value ? Number(e.target.value) : '';
            const p = products.find((x) => x.id === Number(pid));
            onChange(idx, {
              ...item,
              productId: pid, // držimo broj (ili '' kad nije izabrano)
              name: p?.name || '', // info-only u UI
              code: p?.code || '', // info-only u UI
            });
          }}
          required
        >
          <option value=''>— izaberite artikal —</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code ? `${p.code} — ${p.name}` : p.name}
            </option>
          ))}
        </select>
        <div className='mt-1 text-xs text-slate-500'>
          {selectedProduct
            ? `Naziv: ${selectedProduct.name}${
                selectedProduct.code ? ` · Šifra: ${selectedProduct.code}` : ''
              }`
            : 'Nijedan artikal nije izabran.'}
        </div>
      </div>

      {/* Qty */}
      <div className='sm:col-span-2'>
        <label className='block text-sm mb-1 text-slate-700'>Količina *</label>
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

      {/* Unit price (bez PDV) */}
      <div className='sm:col-span-2'>
        <label className='block text-sm mb-1 text-slate-700'>
          Jed. cena (bez PDV) *
        </label>
        <input
          type='number'
          min='0'
          step='0.01'
          className='w-full rounded-lg border border-slate-300 px-3 py-2'
          value={item.unit_price}
          onChange={(e) =>
            onChange(idx, { ...item, unit_price: Number(e.target.value) })
          }
          required
        />
      </div>

      {/* PDV */}
      <div className='sm:col-span-2'>
        <label className='block text-sm mb-1 text-slate-700'>PDV % *</label>
        <select
          className='w-full rounded-lg border border-slate-300 px-3 py-2'
          value={item.tax_rate}
          onChange={(e) =>
            onChange(idx, { ...item, tax_rate: Number(e.target.value) })
          }
          required
        >
          {TAX_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}%
            </option>
          ))}
        </select>
      </div>

      {/* Remove */}
      <div className='sm:col-span-2 flex gap-2'>
        <button
          type='button'
          onClick={() => onRemove(idx)}
          className='w-full rounded-lg bg-red-600 text-white px-3 py-2 hover:bg-red-700 transition'
        >
          Ukloni
        </button>
      </div>

      {/* Calculated row */}
      <div className='sm:col-span-12 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600'>
        <div>
          Jed. cena sa PDV:{' '}
          <span className='font-semibold text-slate-900'>
            {num(unitWithVat)}
          </span>
        </div>
        <div>
          Ukupno bez PDV:{' '}
          <span className='font-semibold text-slate-900'>{num(lineTotal)}</span>
        </div>
        <div>
          Ukupno sa PDV:{' '}
          <span className='font-semibold text-slate-900'>
            {num(lineTotalWithVat)}
          </span>
        </div>
        <div className='text-right sm:text-left'>
          {selectedProduct?.material_type
            ? `Vrsta: ${selectedProduct.material_type}`
            : '\u00A0'}
        </div>
      </div>
    </div>
  );
}

export default function CreateInvoice() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [products, setProducts] = useState([]);
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
    { productId: '', name: '', code: '', qty: 1, unit_price: 0, tax_rate: 0 },
  ]);

  // ukupni iznosi
  const totals = useMemo(() => {
    let sumNoVat = 0;
    let sumWithVat = 0;
    for (const i of items) {
      const qty = Number(i.qty || 0);
      const up = Number(i.unit_price || 0);
      const vat = Number(i.tax_rate || 0);
      sumNoVat += qty * up;
      sumWithVat += qty * up * (1 + vat / 100);
    }
    return {
      noVat: Number(sumNoVat.toFixed(2)),
      withVat: Number(sumWithVat.toFixed(2)),
    };
  }, [items]);

  // učitaj artikle
  useEffect(() => {
    (async () => {
      try {
        const res = await api.listProducts();
        setProducts(res.items || []);
      } catch (e) {
        setError(e.message || 'Greška pri učitavanju artikala');
      }
    })();
  }, []);

  const changeItem = (idx, next) => {
    setItems((arr) => arr.map((it, i) => (i === idx ? next : it)));
  };
  const removeItem = (idx) => {
    setItems((arr) => arr.filter((_, i) => i !== idx));
  };
  const addItem = () => {
    setItems((arr) => [
      ...arr,
      { productId: '', name: '', code: '', qty: 1, unit_price: 0, tax_rate: 0 },
    ]);
  };

  const validate = () => {
    const fe = {};
    const errors = [];

    if (!form.number.trim()) fe.number = 'Broj fakture je obavezan';
    if (!/^\d{9}$/.test(form.recipient_pib.trim()))
      fe.recipient_pib = 'PIB mora imati tačno 9 cifara';
    if (!form.issue_date) fe.issue_date = 'Datum izdavanja je obavezan';
    if (form.due_date && form.issue_date && form.due_date < form.issue_date) {
      fe.due_date = 'Rok plaćanja ne može biti pre datuma izdavanja';
    }
    if (!['RSD', 'EUR', 'USD'].includes(form.currency))
      fe.currency = 'Nepodržana valuta';
    if (!['draft', 'sent'].includes(form.status))
      fe.status = 'Dozvoljeni statusi: draft, sent';

    if (!Array.isArray(items) || items.length === 0) {
      errors.push('Potrebna je bar jedna stavka.');
    } else {
      items.forEach((it, i) => {
        const pe = {};
        if (
          !(Number.isInteger(Number(it.productId)) && Number(it.productId) > 0)
        ) {
          pe.productId = 'Izaberite artikal (obavezno)';
        }
        if (!(Number(it.qty) > 0)) pe.qty = 'Količina mora biti > 0';
        if (!(Number(it.unit_price) >= 0))
          pe.unit_price = 'Jedinična cena mora biti ≥ 0';
        if (!TAX_OPTIONS.includes(Number(it.tax_rate)))
          pe.tax_rate = 'PDV mora biti 0, 10 ili 20';
        if (Object.keys(pe).length) fe[`item_${i}`] = pe;
      });
    }

    setFieldErrors(fe);
    if (errors.length || Object.keys(fe).length) {
      if (errors.length) setError(errors.join(' '));
      return false;
    }
    setError('');
    return true;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      // >>> KLJUČNO: šaljemo product_id (snake_case) koji backend traži
      const payloadItems = items.map((i) => ({
        product_id: Number(i.productId), // obavezno i integer
        qty: Number(i.qty),
        unit_price: Number(i.unit_price), // BEZ PDV
        tax_rate: Number(i.tax_rate), // 0/10/20
      }));

      const payload = {
        number: form.number.trim(),
        issue_date: form.issue_date,
        due_date: form.due_date || null,
        currency: form.currency,
        recipient_pib: form.recipient_pib.trim(),
        status: form.status,
        items: payloadItems,
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
                    Broj fakture *
                  </span>
                  <input
                    className={`w-full rounded-lg border px-3 py-2 ${
                      fieldErrors.number ? 'border-red-400' : 'border-slate-300'
                    }`}
                    value={form.number}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, number: e.target.value }))
                    }
                    required
                    placeholder='npr. 100000001-INV-2025-001'
                  />
                  {fieldErrors.number && (
                    <div className='text-xs text-red-600 mt-1'>
                      {fieldErrors.number}
                    </div>
                  )}
                </label>

                <label className='block'>
                  <span className='mb-1 block text-sm font-medium text-slate-700'>
                    PIB komitenta *
                  </span>
                  <input
                    className={`w-full rounded-lg border px-3 py-2 ${
                      fieldErrors.recipient_pib
                        ? 'border-red-400'
                        : 'border-slate-300'
                    }`}
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
                  {fieldErrors.recipient_pib && (
                    <div className='text-xs text-red-600 mt-1'>
                      {fieldErrors.recipient_pib}
                    </div>
                  )}
                </label>

                <label className='block'>
                  <span className='mb-1 block text-sm font-medium text-slate-700'>
                    Datum izdavanja *
                  </span>
                  <input
                    type='date'
                    className={`w-full rounded-lg border px-3 py-2 ${
                      fieldErrors.issue_date
                        ? 'border-red-400'
                        : 'border-slate-300'
                    }`}
                    value={form.issue_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, issue_date: e.target.value }))
                    }
                    required
                  />
                  {fieldErrors.issue_date && (
                    <div className='text-xs text-red-600 mt-1'>
                      {fieldErrors.issue_date}
                    </div>
                  )}
                </label>

                <label className='block'>
                  <span className='mb-1 block text-sm font-medium text-slate-700'>
                    Rok plaćanja
                  </span>
                  <input
                    type='date'
                    className={`w-full rounded-lg border px-3 py-2 ${
                      fieldErrors.due_date
                        ? 'border-red-400'
                        : 'border-slate-300'
                    }`}
                    value={form.due_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, due_date: e.target.value }))
                    }
                  />
                  {fieldErrors.due_date && (
                    <div className='text-xs text-red-600 mt-1'>
                      {fieldErrors.due_date}
                    </div>
                  )}
                </label>

                <label className='block'>
                  <span className='mb-1 block text-sm font-medium text-slate-700'>
                    Valuta *
                  </span>
                  <select
                    className={`w-full rounded-lg border px-3 py-2 ${
                      fieldErrors.currency
                        ? 'border-red-400'
                        : 'border-slate-300'
                    }`}
                    value={form.currency}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, currency: e.target.value }))
                    }
                  >
                    <option value='RSD'>RSD</option>
                    <option value='EUR'>EUR</option>
                    <option value='USD'>USD</option>
                  </select>
                  {fieldErrors.currency && (
                    <div className='text-xs text-red-600 mt-1'>
                      {fieldErrors.currency}
                    </div>
                  )}
                </label>

                <label className='block'>
                  <span className='mb-1 block text-sm font-medium text-slate-700'>
                    Status *
                  </span>
                  <select
                    className={`w-full rounded-lg border px-3 py-2 ${
                      fieldErrors.status ? 'border-red-400' : 'border-slate-300'
                    }`}
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value }))
                    }
                  >
                    <option value='draft'>draft</option>
                    <option value='sent'>sent</option>
                  </select>
                  {fieldErrors.status && (
                    <div className='text-xs text-red-600 mt-1'>
                      {fieldErrors.status}
                    </div>
                  )}
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

              <div className='space-y-5'>
                {items.map((it, idx) => (
                  <div key={idx} className='space-y-2'>
                    <ItemRow
                      idx={idx}
                      item={it}
                      onChange={changeItem}
                      onRemove={removeItem}
                      products={products}
                    />
                    {fieldErrors[`item_${idx}`] && (
                      <div className='rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700'>
                        {Object.values(fieldErrors[`item_${idx}`]).join(' · ')}
                      </div>
                    )}
                    <div className='h-px bg-slate-100' />
                  </div>
                ))}
              </div>

              <div className='flex flex-col sm:flex-row items-end sm:items-center justify-end gap-4 pt-2'>
                <div className='text-sm text-slate-600'>Ukupno (bez PDV):</div>
                <div className='text-lg font-semibold text-slate-900'>
                  {num(totals.noVat)} {form.currency}
                </div>
                <div className='text-sm text-slate-600 sm:ml-6'>
                  Ukupno (sa PDV):
                </div>
                <div className='text-lg font-semibold text-slate-900'>
                  {num(totals.withVat)} {form.currency}
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
