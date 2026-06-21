// In production (Vercel), the frontend and /api functions share the same
// domain, so an empty base means requests go to relative paths like
// "/api/products". Locally, point VITE_API_URL at your dev server if you're
// running `vercel dev` on a different port, or leave it unset to use relative
// paths against the same Vite dev server proxy.
const API_BASE = import.meta.env.VITE_API_URL || '';

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  // auth
  ownerLogin: (password) => request('/api/owner/login', { method: 'POST', body: { password } }),
  changeOwnerPassword: (token, currentPassword, newPassword) =>
    request('/api/owner/change-password', { method: 'POST', token, body: { currentPassword, newPassword } }),

  // products
  getProducts: () => request('/api/products'),
  getProductByBarcode: (barcode) => request(`/api/products/barcode/${encodeURIComponent(barcode)}`),
  createProduct: (token, product) => request('/api/products', { method: 'POST', token, body: product }),
  updateProduct: (token, id, updates) => request(`/api/products/${id}`, { method: 'PUT', token, body: updates }),
  deleteProduct: (token, id) => request(`/api/products/${id}`, { method: 'DELETE', token }),

  // scanning
  scanLookup: (barcode) => request('/api/scan/lookup', { method: 'POST', body: { barcode } }),
  scanAdjust: (payload, token) => request('/api/scan/adjust', { method: 'POST', token, body: payload }),

  // activity
  getScanLog: (limit = 50) => request(`/api/scan-log?limit=${limit}`)
};

export { API_BASE };
