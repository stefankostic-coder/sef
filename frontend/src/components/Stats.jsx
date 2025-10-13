import { useEffect, useMemo, useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext'; // <-- prilagodi putanju ako je drugačija
import {
  Package,
  FileText,
  ArrowDownToDot,
  ArrowUpFromDot,
  CircleDollarSign,
  AlertTriangle,
  Users,
  Receipt,
  Scale,
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
  const { user, booted } = useAuth(); // <-- koristimo kontekst
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // user-vid
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState({ outbound: [], inbound: [] });

  // admin-vid
  const [users, setUsers] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);

  const isAdmin =
    (user?.role && String(user.role).toLowerCase() === 'admin') ||
    user?.isAdmin === true;

  useEffect(() => {
    // sačekaj dok AuthProvider ne završi bootstrap
    if (!booted) return;

    (async () => {
      try {
        setErr('');
        setLoading(true);

        if (isAdmin) {
          // ADMIN grana: povuci sve korisnike i sve fakture
          const [usersRes, invAllRes] = await Promise.all([
            api.adminListUsers(),
            api.adminListInvoices(), // vidi prethodnu poruku za dodavanje metode u api.js
          ]);

          setUsers(usersRes?.items || usersRes?.users || []);

          // normalizacija invoices odgovora
          const merged =
            invAllRes?.items ||
            invAllRes?.all || [
              ...(invAllRes?.outbound || []),
              ...(invAllRes?.inbound || []),
            ] ||
            invAllRes ||
            [];

          setAllInvoices(Array.isArray(merged) ? merged : []);
        } else {
          // KORISNIČKA grana
          const [prodRes, invRes] = await Promise.all([
            api.listProducts(),
            api.listInvoices(),
          ]);
          setProducts(prodRes.items || []);
          setInvoices({
            outbound: invRes.outbound || invRes.items || [],
            inbound: invRes.inbound || [],
          });
        }
      } catch (e) {
        setErr(e?.message || 'Greška pri učitavanju podataka');
      } finally {
        setLoading(false);
      }
    })();
  }, [booted, isAdmin]); // bitno: rerun kada saznamo ulogu

  // helpers
  const sum = (arr, get = (x) => x) =>
    arr.reduce((acc, x) => acc + Number(get(x) || 0), 0);

  const userStats = useMemo(() => {
    if (isAdmin) return null;
    const out = invoices.outbound || [];
    const inn = invoices.inbound || [];

    const totalOut = sum(out, (x) => x.total_amount);
    const totalIn = sum(inn, (x) => x.total_amount);

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
      totalOutLabel: currency(totalOut, anyOut),
      totalInLabel: currency(totalIn, anyIn),
      dueToMeLabel: currency(dueToMe, anyOut),
      dueToOthersLabel: currency(dueToOthers, anyIn),
    };
  }, [isAdmin, products, invoices]);

  const adminStats = useMemo(() => {
    if (!isAdmin) return null;

    // grupiši promet po valuti
    const byCurrency = allInvoices.reduce((acc, inv) => {
      const cur = inv?.currency || 'RSD';
      const amt = Number(inv?.total_amount || 0);
      if (!acc[cur]) acc[cur] = 0;
      acc[cur] += isFinite(amt) ? amt : 0;
      return acc;
    }, {});

    const currencies = Object.keys(byCurrency);
    let volumeLabel = '0.00 RSD';
    let volumeSubtitle = '';

    if (currencies.length === 0) {
      volumeLabel = '0.00 RSD';
    } else if (currencies.length === 1) {
      const cur = currencies[0];
      volumeLabel = currency(byCurrency[cur], cur);
    } else {
      volumeLabel = 'Više valuta';
      volumeSubtitle = currencies
        .map((c) => currency(byCurrency[c], c))
        .join(' • ');
    }

    return {
      usersCount: users.length,
      invoicesCount: allInvoices.length,
      volumeLabel,
      volumeSubtitle,
    };
  }, [isAdmin, users, allInvoices]);

  if (!booted) {
    // čekaj da AuthProvider završi refreshMe()
    return (
      <section className='mt-10 px-4'>
        <div className='rounded-2xl border border-slate-200 bg-white p-6 text-slate-600'>
          Učitavanje…
        </div>
      </section>
    );
  }

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

  // --- ADMIN PRIKAZ ---
  if (isAdmin && adminStats) {
    return (
      <section className='mt-10 space-y-6 px-4'>
        <div className='grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>
          <StatCard
            icon={<Users className='h-4 w-4' />}
            title='Broj korisnika'
            value={adminStats.usersCount}
          />
          <StatCard
            icon={<Receipt className='h-4 w-4' />}
            title='Ukupno faktura'
            value={adminStats.invoicesCount}
          />
          <StatCard
            icon={<Scale className='h-4 w-4' />}
            title='Ukupni promet'
            value={adminStats.volumeLabel}
            subtitle={adminStats.volumeSubtitle}
          />
        </div>
      </section>
    );
  }

  // --- KORISNIČKI (NE-ADMIN) PRIKAZ ---
  const stats = userStats;

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
