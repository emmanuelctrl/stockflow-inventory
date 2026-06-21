import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { api } from '../lib/api';
import ProductModal from '../components/ProductModal';
import OwnerScanModal from '../components/OwnerScanModal';
import ScanFeed from '../components/ScanFeed';
import './OwnerDashboard.css';

const POLL_INTERVAL = 4000;

export default function OwnerDashboard() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [scanLog, setScanLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modalState, setModalState] = useState({ open: false, product: null });
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [actionError, setActionError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [prods, log] = await Promise.all([api.getProducts(), api.getScanLog(40)]);
      setProducts(prods);
      setScanLog(log);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Intentional: fetch on mount, then poll. This is a standard data-fetching
    // effect (see https://react.dev/learn/you-might-not-need-an-effect#fetching-data),
    // not a state-derivation effect, so the synchronous setState inside loadData is expected.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    const interval = setInterval(loadData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [loadData]);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category || 'General'));
    return ['all', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesSearch =
          !search ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.barcode.includes(search) ||
          (p.sku || '').toLowerCase().includes(search.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || (p.category || 'General') === categoryFilter;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, search, categoryFilter]);

  const stats = useMemo(() => {
    const totalItems = products.reduce((sum, p) => sum + p.quantity, 0);
    const lowStock = products.filter((p) => p.quantity <= (p.lowStockThreshold ?? 5)).length;
    const totalValue = products.reduce((sum, p) => sum + p.quantity * (p.unitPrice || 0), 0);
    return { skuCount: products.length, totalItems, lowStock, totalValue };
  }, [products]);

  async function handleSaveProduct(formData) {
    setActionError(null);
    try {
      if (modalState.product) {
        await api.updateProduct(token, modalState.product.id, formData);
      } else {
        await api.createProduct(token, formData);
      }
      setModalState({ open: false, product: null });
      loadData();
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handleDeleteProduct(product) {
    if (!window.confirm(`Remove "${product.name}" from inventory? This can't be undone.`)) return;
    try {
      await api.deleteProduct(token, product.id);
      loadData();
    } catch (err) {
      setActionError(err.message);
    }
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="owner">
      <header className="owner-header">
        <div className="owner-header-left">
          <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
            <rect x="25" y="30" width="50" height="40" rx="3" stroke="var(--signal)" strokeWidth="6" />
            <line x1="35" y1="30" x2="35" y2="70" stroke="var(--signal)" strokeWidth="4" />
            <line x1="50" y1="30" x2="50" y2="70" stroke="var(--signal)" strokeWidth="4" />
            <line x1="65" y1="30" x2="65" y2="70" stroke="var(--signal)" strokeWidth="4" />
          </svg>
          <span className="owner-header-title">StockFlow</span>
          <span className="owner-header-badge">Owner</span>
        </div>
        <button className="owner-logout" onClick={handleLogout}>Log out</button>
      </header>

      <main className="owner-main">
        <section className="owner-stats">
          <div className="stat-card">
            <span className="stat-label">SKUs tracked</span>
            <span className="stat-value mono-num">{stats.skuCount}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Units in stock</span>
            <span className="stat-value mono-num">{stats.totalItems.toLocaleString()}</span>
          </div>
          <div className="stat-card stat-card--warning" data-active={stats.lowStock > 0}>
            <span className="stat-label">Low stock</span>
            <span className="stat-value mono-num">{stats.lowStock}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Inventory value</span>
            <span className="stat-value mono-num">${stats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        </section>

        <div className="owner-body">
          <section className="owner-panel owner-panel--products">
            <div className="panel-toolbar">
              <input
                className="panel-search"
                placeholder="Search by name, SKU, or barcode…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                {categories.map((c) => (
                  <option key={c} value={c}>{c === 'all' ? 'All categories' : c}</option>
                ))}
              </select>
              <button className="panel-scan-btn" onClick={() => setScanModalOpen(true)}>
                📷 Scan to add stock
              </button>
              <button className="panel-add-btn" onClick={() => setModalState({ open: true, product: null })}>
                + Add product
              </button>
            </div>

            {actionError && <p className="panel-error">{actionError}</p>}
            {error && <p className="panel-error">Couldn't reach the server: {error}</p>}

            <div className="product-table-wrap">
              {loading ? (
                <p className="panel-empty">Loading inventory…</p>
              ) : filteredProducts.length === 0 ? (
                <p className="panel-empty">
                  {products.length === 0
                    ? 'No products yet. Add one, or use "Scan to add stock" above.'
                    : 'No products match your search.'}
                </p>
              ) : (
                <table className="product-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Category</th>
                      <th>Barcode</th>
                      <th className="num">Qty</th>
                      <th className="num">Unit price</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p) => {
                      const isLow = p.quantity <= (p.lowStockThreshold ?? 5);
                      return (
                        <tr key={p.id}>
                          <td className="product-name">{p.name}</td>
                          <td className="dim">{p.sku || '—'}</td>
                          <td className="dim">{p.category || 'General'}</td>
                          <td className="mono-num dim">{p.barcode}</td>
                          <td className={`num mono-num ${isLow ? 'qty-low' : ''}`}>
                            {p.quantity}
                            {isLow && <span className="low-dot" title="Low stock" />}
                          </td>
                          <td className="num mono-num dim">${(p.unitPrice || 0).toFixed(2)}</td>
                          <td className="row-actions">
                            <button onClick={() => setModalState({ open: true, product: p })} title="Edit">Edit</button>
                            <button onClick={() => handleDeleteProduct(p)} title="Delete" className="danger">Delete</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section className="owner-panel owner-panel--feed">
            <h2 className="panel-title">Live activity</h2>
            <p className="panel-subtitle">Updates automatically as workers scan</p>
            <ScanFeed entries={scanLog} />
          </section>
        </div>
      </main>

      {modalState.open && (
        <ProductModal
          product={modalState.product}
          onClose={() => { setModalState({ open: false, product: null }); setActionError(null); }}
          onSave={handleSaveProduct}
          error={actionError}
        />
      )}

      {scanModalOpen && (
        <OwnerScanModal
          token={token}
          onClose={() => setScanModalOpen(false)}
          onChanged={loadData}
        />
      )}
    </div>
  );
}
