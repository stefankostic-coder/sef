import { useEffect, useMemo, useState } from 'react';
import { api } from '../utils/api';
import {
  Package,
  FileText,
  ArrowDownToDot,
  ArrowUpFromDot,
  CircleDollarSign,
  AlertTriangle,
} from 'lucide-react';

function StatCard({ icon, title, value, subtitle }) {
  return (
    <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
      <div className='flex items-center gap-2 text-slate-900 font-semibold'>
        <span className='grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-700'>
          {icon}
        </span>
        {title}
      </div>
      <div className='mt-3 text-2xl font-bold tracking-tight'>{value}</div>
      {subtitle ? (
        <div className='mt-1 text-xs text-slate-500'>{subtitle}</div>
      ) : null}
    </div>
  );
}

function currency(n, cur = 'RSD') {
  const num = Number(n || 0);
  if (!isFinite(num)) return `0.00 ${cur}`;
  return `${num.toFixed(2)} ${cur}`;
}

export default function Stats() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState({ outbound: [], inbound: [] });

  useEffect(() => {
    (async () => {
      try {
        setErr('');
        setLoading(true);
        const [prodRes, invRes] = await Promise.all([
          api.listProducts(),
          api.listInvoices(),
        ]);
        setProducts(prodRes.items || []);
        setInvoices({
          outbound: invRes.outbound || invRes.items || [],
          inbound: invRes.inbound || [],
        });
      } catch (e) {
        setErr(e.message || 'Greška pri učitavanju podataka');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const out = invoices.outbound || [];
    const inn = invoices.inbound || [];

    const sum = (arr, get = (x) => x) =>
      arr.reduce((acc, x) => acc + Number(get(x) || 0), 0);

    const totalOut = sum(out, (x) => x.total_amount);
    const totalIn = sum(inn, (x) => x.total_amount);

    // dugovanja: sve što NIJE paid/cancelled
    const isOpen = (s) =>
      String(s).toLowerCase() !== 'paid' &&
      String(s).toLowerCase() !== 'cancelled';
    const dueToMe = sum(
      out.filter((x) => isOpen(x.status)),
      (x) => x.total_amount
    );
    const dueToOthers = sum(
      inn.filter((x) => isOpen(x.status)),
      (x) => x.total_amount
    );

    const anyOut = out[0]?.currency || 'RSD';
    const anyIn = inn[0]?.currency || anyOut;

    return {
      productsCount: products.length,
      outCount: out.length,
      inCount: inn.length,
      totalOutLabel: currency(totalOut, anyOut), // „dolazi” (drugi duguju meni)
      totalInLabel: currency(totalIn, anyIn), // „odlazi” (ja dugujem drugima)
      dueToMeLabel: currency(dueToMe, anyOut),
      dueToOthersLabel: currency(dueToOthers, anyIn),
    };
  }, [products, invoices]);

  if (loading) {
    return (
      <section className='mt-10 px-4'>
        <div className='rounded-2xl border border-slate-200 bg-white p-6 text-slate-600'>
          Učitavanje pregleda…
        </div>
      </section>
    );
  }

  if (err) {
    return (
      <section className='mt-10 px-4'>
        <div className='rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm'>
          {err}
        </div>
      </section>
    );
  }

  return (
    <section className='mt-10 space-y-6 px-4'>
      {/* Gornje kartice */}
      <div className='grid gap-5 sm:grid-cols-2 lg:grid-cols-4'>
        <StatCard
          icon={<Package className='h-4 w-4' />}
          title='Broj artikala'
          value={stats.productsCount}
        />
        <StatCard
          icon={<FileText className='h-4 w-4' />}
          title='Izdate fakture'
          value={stats.outCount}
        />
        <StatCard
          icon={<FileText className='h-4 w-4' />}
          title='Ulazne fakture'
          value={stats.inCount}
        />
        <StatCard
          icon={<CircleDollarSign className='h-4 w-4' />}
          title='Ukupno stavki'
          value={stats.outCount + stats.inCount}
        />
      </div>

      {/* Finansijski sažetak */}
      <div className='grid gap-5 lg:grid-cols-2'>
        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='flex items-center gap-2 text-slate-900 font-semibold'>
            <span className='grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700'>
              <ArrowUpFromDot className='h-4 w-4' />
            </span>
            Ukupno priliva
          </div>
          <div className='mt-3 text-2xl font-bold tracking-tight text-emerald-700'>
            {stats.totalOutLabel}
          </div>
          <div className='mt-4 h-2 w-full rounded-full bg-slate-100'>
            <div
              className='h-2 rounded-full bg-emerald-500'
              style={{ width: '65%' }}
            />
          </div>
          <div className='mt-3 text-xs text-slate-500'>
            Sumirano po svim izdatim fakturama (bilo kog statusa).
          </div>
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='flex items-center gap-2 text-slate-900 font-semibold'>
            <span className='grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-rose-700'>
              <ArrowDownToDot className='h-4 w-4' />
            </span>
            Ukupno odliva
          </div>
          <div className='mt-3 text-2xl font-bold tracking-tight text-rose-700'>
            {stats.totalInLabel}
          </div>
          <div className='mt-4 h-2 w-full rounded-full bg-slate-100'>
            <div
              className='h-2 rounded-full bg-rose-500'
              style={{ width: '48%' }}
            />
          </div>
          <div className='mt-3 text-xs text-slate-500'>
            Sumirano po svim primljenim fakturama (bilo kog statusa).
          </div>
        </div>
      </div>

      {/* Dugovanja */}
      <div className='grid gap-5 lg:grid-cols-2'>
        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='flex items-center gap-2 text-slate-900 font-semibold'>
            <span className='grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-700'>
              <AlertTriangle className='h-4 w-4' />
            </span>
            Potraživanja
          </div>
          <div className='mt-3 text-2xl font-bold tracking-tight'>
            {stats.dueToMeLabel}
          </div>
          <div className='mt-1 text-xs text-slate-500'>
            Otvorene (neplaćene/nekancelisane) izlazne fakture.
          </div>
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='flex items-center gap-2 text-slate-900 font-semibold'>
            <span className='grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-700'>
              <AlertTriangle className='h-4 w-4' />
            </span>
            Dugovanja
          </div>
          <div className='mt-3 text-2xl font-bold tracking-tight'>
            {stats.dueToOthersLabel}
          </div>
          <div className='mt-1 text-xs text-slate-500'>
            Otvorene (neplaćene/nekancelisane) ulazne fakture.
          </div>
        </div>
      </div>
    </section>
  );
}
