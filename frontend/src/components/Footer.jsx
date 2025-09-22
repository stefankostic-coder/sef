export default function Footer() {
  return (
    <footer className='mx-auto border-t border-slate-200/60 bg-white/60 backdrop-blur'>
      <div className='container py-6 text-center text-sm text-slate-600'>
        © {new Date().getFullYear()} SEF e-Fakture • Demo
      </div>
    </footer>
  );
}
