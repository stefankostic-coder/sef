import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  FileText,
  ShieldCheck,
  Send,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isCompany = user?.role === 'company';

  return (
    <div className='min-h-dvh grid grid-rows-[auto_1fr_auto]'>
      <Navbar />

      <main className='container mx-auto py-10'>
        {/* HERO */}
        <section className='mx-auto max-w-5xl text-center space-y-6 px-4'>
          <div className='inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700'>
            <ShieldCheck className='h-3.5 w-3.5' />
            SEF-friendly workflow
          </div>

          <h1 className='text-3xl sm:text-5xl font-bold tracking-tight text-slate-900'>
            Jednostavno upravljanje{' '}
            <span className='text-indigo-600'>e-fakturama</span>
          </h1>

          <p className='text-slate-600 max-w-2xl mx-auto'>
            Kreirajte, šaljite i pratite fakture. Admin verifikuje kompanije,
            kompanije razmenjuju fakture i dobijaju jasan pregled ulaznih i
            izlaznih dokumenata.
          </p>

          {/* CTA – prilagođeno ulozi */}
          <div className='flex flex-wrap items-center justify-center gap-3 pt-2'>
            {isCompany && (
              <>
                <a
                  href='/invoices/new'
                  className='inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-white font-medium hover:bg-indigo-700 transition'
                >
                  <Send className='h-4 w-4' />
                  Nova faktura
                </a>
                <a
                  href='/invoices'
                  className='inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-800 hover:bg-slate-50 transition'
                >
                  Moje fakture
                  <ArrowRight className='h-4 w-4' />
                </a>
              </>
            )}
            {isAdmin && (
              <>
                <a
                  href='/admin/invoices'
                  className='inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-white font-medium hover:bg-indigo-700 transition'
                >
                  <FileText className='h-4 w-4' />
                  Sve fakture
                </a>
                <a
                  href='/admin/users'
                  className='inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-800 hover:bg-slate-50 transition'
                >
                  Korisnici
                  <ArrowRight className='h-4 w-4' />
                </a>
              </>
            )}
          </div>

          {/* “Preview” kartica */}
          <div className='mx-auto max-w-5xl mt-8'>
            <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-lg'>
              <div className='grid gap-4 sm:grid-cols-3'>
                <div className='rounded-xl border border-slate-200 p-4'>
                  <div className='flex items-center gap-2 text-slate-700'>
                    <FileText className='h-4 w-4 text-indigo-600' />
                    Broj fakture
                  </div>
                  <div className='mt-2 h-8 rounded-md bg-slate-100' />
                </div>
                <div className='rounded-xl border border-slate-200 p-4'>
                  <div className='flex items-center gap-2 text-slate-700'>
                    <ShieldCheck className='h-4 w-4 text-indigo-600' />
                    PIB komitenta
                  </div>
                  <div className='mt-2 h-8 rounded-md bg-slate-100' />
                </div>
                <div className='rounded-xl border border-slate-200 p-4'>
                  <div className='flex items-center gap-2 text-slate-700'>
                    <CheckCircle2 className='h-4 w-4 text-indigo-600' />
                    Status
                  </div>
                  <div className='mt-2 h-8 rounded-md bg-slate-100' />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className='mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 px-4'>
          {[
            {
              title: 'Brzo kreiranje',
              desc: 'Vođeni formular sa stavkama, automatskim izračunavanjem iznosa i valutama.',
              icon: <Send className='h-5 w-5 text-indigo-600' />,
            },
            {
              title: 'Ulazne i izlazne',
              desc: 'Jasan razdvojeni prikaz: ono što šaljete i ono što primate (po PIB-u komitenta).',
              icon: <FileText className='h-5 w-5 text-indigo-600' />,
            },
            {
              title: 'Admin verifikacija',
              desc: 'Administrator može da verifikuje kompanije i ima pregled svih faktura.',
              icon: <ShieldCheck className='h-5 w-5 text-indigo-600' />,
            },
          ].map((c) => (
            <div
              key={c.title}
              className='rounded-2xl border border-slate-200 bg-white p-5 shadow hover:shadow-md transition'
            >
              <div className='flex items-center gap-2 text-slate-900 font-semibold'>
                {c.icon}
                {c.title}
              </div>
              <p className='mt-2 text-sm text-slate-600'>{c.desc}</p>
              <div className='mt-4 h-1 rounded-full bg-gradient-to-r from-indigo-600 to-transparent opacity-70' />
            </div>
          ))}
        </section>
      </main>

      <Footer />
    </div>
  );
}
