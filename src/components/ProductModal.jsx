import { useState } from 'react';
import './ProductModal.css';

const emptyForm = {
  barcode: '',
  name: '',
  sku: '',
  quantity: 0,
  lowStockThreshold: 5,
  category: '',
  unitPrice: 0
};

export default function ProductModal({ product, onClose, onSave, error }) {
  const [form, setForm] = useState(
    product
      ? {
          barcode: product.barcode,
          name: product.name,
          sku: product.sku || '',
          quantity: product.quantity,
          lowStockThreshold: product.lowStockThreshold,
          category: product.category || '',
          unitPrice: product.unitPrice || 0
        }
      : emptyForm
  );

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{product ? 'Edit product' : 'Add product'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <label>Product name</label>
            <input value={form.name} onChange={(e) => update('name', e.target.value)} required autoFocus />
          </div>

          <div className="form-grid">
            <div className="form-row">
              <label>Barcode</label>
              <input value={form.barcode} onChange={(e) => update('barcode', e.target.value)} required />
            </div>
            <div className="form-row">
              <label>SKU</label>
              <input value={form.sku} onChange={(e) => update('sku', e.target.value)} />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-row">
              <label>Category</label>
              <input value={form.category} onChange={(e) => update('category', e.target.value)} placeholder="General" />
            </div>
            <div className="form-row">
              <label>Unit price</label>
              <input type="number" min="0" step="0.01" value={form.unitPrice} onChange={(e) => update('unitPrice', e.target.value)} />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-row">
              <label>Quantity in stock</label>
              <input type="number" min="0" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} required />
            </div>
            <div className="form-row">
              <label>Low stock alert at</label>
              <input type="number" min="0" value={form.lowStockThreshold} onChange={(e) => update('lowStockThreshold', e.target.value)} />
            </div>
          </div>

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="modal-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="modal-save">{product ? 'Save changes' : 'Add product'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
