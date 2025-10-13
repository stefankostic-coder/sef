import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RedirectIfAuthed from './components/RedirectIfAuthed.jsx';
import ProtectedAdminRoute from './components/ProtectedAdminRoute.jsx';
import AdminUsers from './pages/admin/Users.jsx';
import AdminInvoices from './pages/admin/Invoices.jsx';
import CompanyInvoices from './pages/Invoices.jsx';
import CreateInvoice from './pages/InvoiceCreate.jsx';
import Products from './pages/Products.jsx';

export default function App() {
  return (
    <Routes>
      <Route
        path='/'
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path='/login'
        element={
          <RedirectIfAuthed>
            <Login />
          </RedirectIfAuthed>
        }
      />
      <Route
        path='/register'
        element={
          <RedirectIfAuthed>
            <Register />
          </RedirectIfAuthed>
        }
      />

      {/* Company */}
      <Route
        path='/invoices'
        element={
          <ProtectedRoute>
            <CompanyInvoices />
          </ProtectedRoute>
        }
      />
      <Route
        path='/invoices/new'
        element={
          <ProtectedRoute>
            <CreateInvoice />
          </ProtectedRoute>
        }
      />
      <Route
        path='/products'
        element={
          <ProtectedRoute>
            <Products />
          </ProtectedRoute>
        }
      />

      {/* Admin-only */}
      <Route
        path='/admin/users'
        element={
          <ProtectedAdminRoute>
            <AdminUsers />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path='/admin/invoices'
        element={
          <ProtectedAdminRoute>
            <AdminInvoices />
          </ProtectedAdminRoute>
        }
      />

      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  );
}
