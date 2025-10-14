import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { api } from '../utils/api.js';
import EmptyImg from '../assets/empty-invoices.svg';

function EmptyState({ title, subtitle, showCreate, createHref }) {
  return (
    <div className='flex flex-col items-center justify-center py-12 text-center'>
      <img
        src={EmptyImg}
        alt='No invoices'
        className='w-48 h-auto opacity-90'
      />
      <h3 className='mt-4 text-lg font-semibold text-slate-900'>{title}</h3>
      {subtitle ? (
        <p className='mt-1 text-sm text-slate-600'>{subtitle}</p>
      ) : null}
      {showCreate && (
        <a
          href={createHref}
          className='mt-5 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition'
        >
          Kreiraj fakturu
        </a>
      )}
    </div>
  );
}

function Table({
  rows,
  title,
  canDelete,
  onDelete,
  emptyProps,
  showActions,
  onSendEmail,
  editableStatus = false,
  onChangeStatus,
}) {
  const hasRows = rows.length > 0;

  const StatusCell = ({ row }) => {
    if (!editableStatus) {
      return (
        <td className='px-4 py-2 uppercase text-slate-600'>{row.status}</td>
      );
    }
    return (
      <td className='px-4 py-2'>
        <select
          value={row.status}
          onChange={(e) => onChangeStatus?.(row.id, e.target.value)}
          className='rounded-lg border border-slate-300 px-2 py-1 text-sm'
        >
          <option value='draft'>draft</option>
          <option value='sent'>sent</option>
          <option value='paid'>paid</option>
          <option value='cancelled'>cancelled</option>
        </select>
      </td>
    );
  };

  return (
    <div className='rounded-xl border border-slate-200 bg-white overflow-x-auto'>
      <div className='px-4 py-3 border-b border-slate-100 bg-slate-50 font-medium'>
        {title}
      </div>

      {!hasRows ? (
        <EmptyState
          title={emptyProps?.title || 'Nema podataka'}
          subtitle={emptyProps?.subtitle}
          showCreate={!!emptyProps?.showCreate}
          createHref={emptyProps?.createHref || '/invoices/new'}
        />
      ) : (
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
              {showActions && <th className='px-4 py-3'>Akcije</th>}
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

                <StatusCell row={r} />

                {showActions && (
                  <td className='px-4 py-2'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <a
                        href={api.getInvoicePdfUrl(r.id)}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50 transition'
                      >
                        PDF
                      </a>
                      <button
                        type='button'
                        onClick={() => onSendEmail?.(r)}
                        className='rounded-lg bg-indigo-600 text-white px-3 py-1.5 hover:bg-indigo-700 transition'
                      >
                        Pošalji mejlom
                      </button>
                    </div>
                  </td>
                )}

                {canDelete && (
                  <td className='px-4 py-2'>
                    <button
                      onClick={() => onDelete(r.id)}
                      className='rounded-lg bg-red-600 text-white px-3 py-1.5 hover:bg-red-700 transition'
                    >
                      Storniraj
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function CompanyInvoices() {
  const [data, setData] = useState({ outbound: [], inbound: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const load = async () => {
    try {
      setErr('');
      setOk('');
      setLoading(true);
      const res = await api.listInvoices();
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

  const onSendEmail = async (row) => {
    const input = window.prompt(
      `Email komitenta za fakturu ${row.number} (ostavite prazno za auto-pretragu po PIB-u ${row.recipient_pib}):`,
      ''
    );
    try {
      await api.sendInvoiceEmail(row.id, input?.trim() || undefined);
      setOk(`Mejl za fakturu ${row.number} je poslat.`);
    } catch (e) {
      setErr(e.message || 'Greška pri slanju mejla');
    }
  };

  const onChangeStatus = async (id, status) => {
    try {
      await api.updateInvoiceStatus(id, status);
      setOk('Status fakture je ažuriran.');
      await load();
    } catch (e) {
      setErr(e.message || 'Greška pri ažuriranju statusa');
    }
  };

  useEffect(() => {
    load();
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
        {ok && (
          <div className='rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700'>
            {ok}
          </div>
        )}

        {loading ? (
          <div className='text-slate-600'>Učitavanje…</div>
        ) : (
          <div className='space-y-6'>
            {/* Izlazne — status je editable + akcije */}
            <Table
              rows={data.outbound}
              title='Izlazne (izdane od mene)'
              canDelete
              onDelete={onDelete}
              showActions
              onSendEmail={onSendEmail}
              editableStatus
              onChangeStatus={onChangeStatus}
              emptyProps={{
                title: 'Još uvek nema izlaznih faktura',
                subtitle: 'Kliknite na dugme ispod da kreirate prvu fakturu.',
                showCreate: true,
                createHref: '/invoices/new',
              }}
            />

            {/* Ulazne — status je read-only */}
            <Table
              rows={data.inbound}
              title='Ulazne (stigle meni)'
              emptyProps={{
                title: 'Još uvek nema ulaznih faktura',
                subtitle:
                  'Kada neko pošalje fakturu sa vašim PIB-om, pojaviće se ovde.',
              }}
            />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
