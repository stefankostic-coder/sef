export const API_BASE =
  import.meta.env.VITE_API_BASE || 'http://localhost:5000';

async function jsonFetch(path, { method = 'GET', body, headers = {} } = {}) {
  const resp = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const isJSON = resp.headers.get('content-type')?.includes('application/json');
  const data = isJSON ? await resp.json() : null;
  if (!resp.ok) {
    const errMsg = data?.error || `HTTP ${resp.status}`;
    throw new Error(errMsg);
  }
  return data;
}

export const api = {
  // Auth
  me: () => jsonFetch('/api/auth/me'),
  login: (email, password) =>
    jsonFetch('/api/auth/login', { method: 'POST', body: { email, password } }),
  register: (payload) =>
    jsonFetch('/api/auth/register', { method: 'POST', body: payload }),
  logout: () => jsonFetch('/api/auth/logout', { method: 'POST' }),

  // Admin: Users
  adminListUsers: () => jsonFetch('/api/users'),
  adminVerifyUser: (userId, verified = true) =>
    jsonFetch(`/api/users/${userId}/verify`, {
      method: 'PATCH',
      body: { verified },
    }),

  // Invoices
  listInvoices: () => jsonFetch('/api/invoices'),
  getInvoice: (id) => jsonFetch(`/api/invoices/${id}`),
  createInvoice: (payload) =>
    jsonFetch('/api/invoices', { method: 'POST', body: payload }),
  deleteInvoice: (id) => jsonFetch(`/api/invoices/${id}`, { method: 'DELETE' }),
  invoicePdf: (id) =>
    fetch(`${API_BASE}/api/invoices/${id}/pdf`, {
      method: 'GET',
      credentials: 'include',
    }),
  getInvoicePdfUrl: (id) => `${API_BASE}/api/invoices/${id}/pdf`,
  sendInvoiceEmail: (id, email) =>
    jsonFetch(`/api/invoices/${id}/send-email`, {
      method: 'POST',
      body: { email },
    }),

  // Products
  listProducts: () => jsonFetch('/api/products'),
  createProduct: (payload) =>
    jsonFetch('/api/products', { method: 'POST', body: payload }),
  deleteProduct: (id) => jsonFetch(`/api/products/${id}`, { method: 'DELETE' }),
};
