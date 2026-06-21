import { useState, useCallback, useRef } from 'react';
import BarcodeScanner from './BarcodeScanner';
import { api } from '../lib/api';
import './OwnerScanModal.css';

// Modes: 'scanning' -> camera active, listening for a code
// 'confirm' -> known product found, choose amount to add
// 'new' -> unknown barcode, name it before adding
export default function OwnerScanModal({ token, onClose, onChanged }) {
  const [mode, setMode] = useState('scanning');
  const [scannedBarcode, setScannedBarcode] = useState(null);
  const [product, setProduct] = useState(null);
  const [amount, setAmount] = useState(1);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((message, kind = 'success') => {
    setToast({ message, kind });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const handleDetected = useCallback(async (code) => {
    if (mode !== 'scanning') return;
    setScannedBarcode(code);
    try {
      const result = await api.scanLookup(code);
      if (result.found) {
        setProduct(result.product);
        setAmount(1);
        setMode('confirm');
      } else {
        setProduct(null);
        setNewName('');
        setNewCategory('');
        setMode('new');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }, [mode, showToast]);

  function backToScanning() {
    setMode('scanning');
    setScannedBarcode(null);
    setProduct(null);
    setAmount(1);
  }

  async function handleAdd() {
    setBusy(true);
    try {
      const res = await api.scanAdjust(
        {
          barcode: scannedBarcode,
          type: 'add',
          amount,
          name: mode === 'new' ? newName : undefined,
          category: mode === 'new' ? newCategory : undefined
        },
        token
      );
      showToast(`+${amount} added · ${res.product.quantity} in stock`, 'success');
      onChanged?.();
      backToScanning();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ownerscan-overlay" onClick={onClose}>
      <div className="ownerscan-panel" onClick={(e) => e.stopPropagation()}>
        <div className="ownerscan-header">
          <h2>Scan to add stock</h2>
          <button className="ownerscan-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="ownerscan-camera">
          <BarcodeScanner onDetected={handleDetected} paused={mode !== 'scanning'} />
          {mode === 'scanning' && <p className="ownerscan-hint">Point the camera at a barcode</p>}
        </div>

        {toast && <div className={`ownerscan-toast ownerscan-toast--${toast.kind}`}>{toast.message}</div>}

        {mode === 'confirm' && product && (
          <div className="ownerscan-sheet">
            <h3>{product.name}</h3>
            <p className="ownerscan-sub">
              {product.sku ? `SKU ${product.sku} · ` : ''}
              Currently <strong className="mono-num">{product.quantity}</strong> in stock
            </p>
            <div className="ownerscan-amount">
              <button onClick={() => setAmount((a) => Math.max(1, a - 1))} aria-label="Decrease">−</button>
              <span className="mono-num">{amount}</span>
              <button onClick={() => setAmount((a) => a + 1)} aria-label="Increase">+</button>
            </div>
            <div className="ownerscan-row">
              <button className="ownerscan-btn ownerscan-btn--ghost" onClick={backToScanning}>Cancel</button>
              <button className="ownerscan-btn ownerscan-btn--add" disabled={busy} onClick={handleAdd}>
                + Add stock
              </button>
            </div>
          </div>
        )}

        {mode === 'new' && (
          <div className="ownerscan-sheet">
            <h3>New barcode</h3>
            <p className="ownerscan-sub">
              <span className="mono-num">{scannedBarcode}</span> isn't in the catalog yet.
            </p>
            <div className="ownerscan-field">
              <label>Item name</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Blue cotton t-shirt" autoFocus />
            </div>
            <div className="ownerscan-field">
              <label>Category (optional)</label>
              <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="e.g. Apparel" />
            </div>
            <div className="ownerscan-amount">
              <button onClick={() => setAmount((a) => Math.max(1, a - 1))} aria-label="Decrease">−</button>
              <span className="mono-num">{amount}</span>
              <button onClick={() => setAmount((a) => a + 1)} aria-label="Increase">+</button>
            </div>
            <div className="ownerscan-row">
              <button className="ownerscan-btn ownerscan-btn--ghost" onClick={backToScanning}>Cancel</button>
              <button className="ownerscan-btn ownerscan-btn--add" disabled={busy || !newName.trim()} onClick={handleAdd}>
                + Add to inventory
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
