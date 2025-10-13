import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { FileText, ShieldCheck, Send, ArrowRight } from 'lucide-react';
import Stats from '../components/Stats.jsx';

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
        </section>

        <Stats />
      </main>

      <Footer />
    </div>
  );
}
