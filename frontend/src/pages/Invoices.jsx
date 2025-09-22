import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { api } from '../utils/api.js';

function Table({ rows, title, canDelete, onDelete }) {
  return (
    <div className='rounded-xl border border-slate-200 bg-white overflow-x-auto'>
      <div className='px-4 py-3 border-b border-slate-100 bg-slate-50 font-medium'>
        {title}
      </div>
      <table className='w-full text-sm'>
        <thead>
          <tr className='text-left'>
            <th className='px-4 py-3'>ID</th>
            <th className='px-4 py-3'>Broj</th>
            <th className='px-4 py-3'>Izdavalac PIB</th>
            <th className='px-4 py-3'>Komitent PIB</th>
            <th className='px-4 py-3'>Datum</th>
            <th className='px-4 py-3'>Iznos</th>
            <th className='px-4 py-3'>Status</th>
            {canDelete && <th className='px-4 py-3'></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className='border-t border-slate-100'>
              <td className='px-4 py-2'>{r.id}</td>
              <td className='px-4 py-2'>{r.number}</td>
              <td className='px-4 py-2'>{r.issuer_pib}</td>
              <td className='px-4 py-2'>{r.recipient_pib}</td>
              <td className='px-4 py-2'>{r.issue_date}</td>
              <td className='px-4 py-2'>
                {typeof r.total_amount === 'number'
                  ? r.total_amount.toFixed(2)
                  : r.total_amount}
              </td>
              <td className='px-4 py-2 uppercase text-slate-600'>{r.status}</td>
              {canDelete && (
                <td className='px-4 py-2'>
                  <button
                    onClick={() => onDelete(r.id)}
                    className='rounded-lg bg-red-600 text-white px-3 py-1.5 hover:bg-red-700 transition'
                  >
                    Obriši
                  </button>
                </td>
              )}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                className='px-4 py-6 text-center text-slate-600'
                colSpan={canDelete ? 8 : 7}
              >
                Nema podataka.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function CompanyInvoices() {
  const [data, setData] = useState({ outbound: [], inbound: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      setErr('');
      setLoading(true);
      const res = await api.listInvoices();
      // očekujemo { outbound, inbound } za company
      setData({ outbound: res.outbound || [], inbound: res.inbound || [] });
    } catch (e) {
      setErr(e.message || 'Greška pri učitavanju faktura');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (id) => {
    try {
      await api.deleteInvoice(id);
      await load();
    } catch (e) {
      setErr(e.message || 'Greška pri brisanju fakture');
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
          <h1 className='text-2xl font-semibold text-slate-900'>
            Moje fakture
          </h1>
          <a
            href='/invoices/new'
            className='rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 transition'
          >
            Kreiraj fakturu
          </a>
        </div>

        {err && (
          <div className='rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
            {err}
          </div>
        )}

        {loading ? (
          <div className='text-slate-600'>Učitavanje…</div>
        ) : (
          <div className='space-y-6'>
            <Table
              rows={data.outbound}
              title='Izlazne (izdane od mene)'
              canDelete
              onDelete={onDelete}
            />
            <Table rows={data.inbound} title='Ulazne (stigle meni)' />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
