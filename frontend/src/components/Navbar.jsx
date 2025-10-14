import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { FileText, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const doLogout = async () => {
    await logout();
    navigate('/login');
  };

  const AdminLinks = () => (
    <div className='flex items-center gap-3'>
      <Link
        to='/admin/users'
        className='text-sm font-medium text-slate-700 hover:text-slate-900 transition'
      >
        Korisnici
      </Link>
      <Link
        to='/admin/invoices'
        className='text-sm font-medium text-slate-700 hover:text-slate-900 transition'
      >
        Fakture
      </Link>
    </div>
  );

  const CompanyLinks = () => (
    <div className='flex items-center gap-3'>
      <Link
        to='/products'
        className='text-sm font-medium text-slate-700 hover:text-slate-900 transition'
      >
        Artikli
      </Link>
      <Link
        to='/invoices'
        className='text-sm font-medium text-slate-700 hover:text-slate-900 transition'
      >
        Moje fakture
      </Link>
      <Link
        to='/invoices/new'
        className='text-sm font-medium rounded-lg bg-indigo-600 text-white px-3 py-1.5 hover:bg-indigo-700 transition'
      >
        Nova faktura
      </Link>
    </div>
  );

  const NavContent = () => (
    <div className='flex items-center gap-4'>
      {user?.role === 'admin' && <AdminLinks />}
      {user?.role === 'company' && <CompanyLinks />}

      {user ? (
        <>
          <span className='hidden sm:inline text-sm text-slate-600'>
            <Link to='/profile' className='hover:underline'>
              {user.name}
            </Link>{' '}
            · <span className='uppercase text-slate-500'>{user.role}</span>
          </span>
          <button
            onClick={doLogout}
            className='inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition'
          >
            <LogOut className='w-4 h-4' />
            Logout
          </button>
        </>
      ) : (
        <>
          <Link
            to='/login'
            className='text-sm font-medium text-slate-700 hover:text-slate-900 transition'
          >
            Login
          </Link>
          <Link
            to='/register'
            className='text-sm font-medium rounded-lg bg-indigo-600 text-white px-3 py-1.5 hover:bg-indigo-700 transition'
          >
            Register
          </Link>
        </>
      )}
    </div>
  );

  return (
    <header className='sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur'>
      <nav className='container mx-auto flex h-16 items-center justify-between gap-4'>
        <Link to='/' className='inline-flex items-center gap-2 font-semibold'>
          <span className='grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white shadow-md'>
            <FileText className='w-5 h-5' />
          </span>
          <span className='text-slate-900'>SEF e-Fakture</span>
        </Link>

        {/* Desktop */}
        <div className='hidden sm:block'>
          <NavContent />
        </div>

        {/* Mobile toggle */}
        <button
          className='sm:hidden inline-flex items-center justify-center rounded-lg border border-slate-300 px-2.5 py-2'
          onClick={() => setOpen((o) => !o)}
          aria-label='Toggle menu'
        >
          {open ? <Menu className='w-5 h-5 hidden' /> : null}
          {open ? <X className='w-5 h-5' /> : <Menu className='w-5 h-5' />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className='sm:hidden border-t border-slate-200 bg-white/90 backdrop-blur'>
          <div className='container mx-auto py-3'>
            <NavContent />
          </div>
        </div>
      )}
    </header>
  );
}
