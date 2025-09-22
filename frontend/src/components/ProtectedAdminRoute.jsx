import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedAdminRoute({ children }) {
  const { user, booted } = useAuth();
  const location = useLocation();

  if (!booted) {
    return (
      <div className='grid place-items-center h-dvh'>
        <div className='animate-pulse text-gray-500'>Učitavanje…</div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to='/login' state={{ from: location }} replace />;
  }
  if (user.role !== 'admin') {
    return <Navigate to='/' replace />;
  }
  return children;
}
