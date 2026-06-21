import { useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import BarcodeScanner from '../components/BarcodeScanner';
import { api } from '../lib/api';
import './WorkerScan.css';

// Modes: 'idle' -> scanner running, listening for a code
// 'confirm' -> a code was found, show product + add/remove controls
// 'new' -> code not found, ask worker to name it before adding
export default function WorkerScan() {
  const [mode, setMode] = useState('idle');
  const [scannedBarcode, setScannedBarcode] = useState(null);
  const [product, setProduct] = useState(null);
  const [amount, setAmount] = useState(1);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [lookupError, setLookupError] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((message, kind = 'success') => {
    setToast({ message, kind });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const handleDetected = useCallback(async (code) => {
    if (mode !== 'idle') return; // ignore scans while a confirm/new panel is open
    setScannedBarcode(code);
    setLookupError(null);
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
      setLookupError(err.message);
      showToast("Couldn't reach the server", 'error');
    }
  }, [mode, showToast]);

  function reset() {
    setMode('idle');
    setScannedBarcode(null);
    setProduct(null);
    setAmount(1);
    setLookupError(null);
  }

  async function handleAdjust(type) {
    setBusy(true);
    try {
      const res = await api.scanAdjust({
        barcode: scannedBarcode,
        type,
        amount,
        name: mode === 'new' ? newName : undefined,
        category: mode === 'new' ? newCategory : undefined
      });
      showToast(
        type === 'add'
          ? `+${amount} added · ${res.product.quantity} in stock`
          : `${amount} removed · ${res.product.quantity} in stock`,
        type === 'add' ? 'success' : 'warning'
      );
      reset();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="worker">
      <header className="worker-header">
        <Link to="/" className="worker-back" aria-label="Back to home">←</Link>
        <span className="worker-header-title">Scan to update stock</span>
        <span className="worker-header-spacer" />
      </header>

      <div className="worker-camera">
        <BarcodeScanner onDetected={handleDetected} paused={mode !== 'idle'} />
        {mode === 'idle' && (
          <p className="worker-hint">Point the camera at a barcode</p>
        )}
      </div>

      {toast && (
        <div className={`worker-toast worker-toast--${toast.kind}`}>{toast.message}</div>
      )}

      {mode === 'confirm' && product && (
        <div className="worker-sheet" role="dialog" aria-label="Confirm stock change">
          <div className="worker-sheet-handle" />
          <h2>{product.name}</h2>
          <p className="worker-sheet-sub">
            {product.sku ? `SKU ${product.sku} · ` : ''}
            Currently <strong className="mono-num">{product.quantity}</strong> in stock
          </p>

          <div className="worker-amount">
            <button onClick={() => setAmount((a) => Math.max(1, a - 1))} aria-label="Decrease amount">−</button>
            <span className="mono-num">{amount}</span>
            <button onClick={() => setAmount((a) => a + 1)} aria-label="Increase amount">+</button>
          </div>

          <div className="worker-actions">
            <button className="worker-action worker-action--remove" disabled={busy} onClick={() => handleAdjust('remove')}>
              − Remove stock
            </button>
            <button className="worker-action worker-action--add" disabled={busy} onClick={() => handleAdjust('add')}>
              + Add stock
            </button>
          </div>

          <button className="worker-cancel" onClick={reset}>Cancel</button>
        </div>
      )}

      {mode === 'new' && (
        <div className="worker-sheet" role="dialog" aria-label="New product">
          <div className="worker-sheet-handle" />
          <h2>New barcode</h2>
          <p className="worker-sheet-sub">
            <span className="mono-num">{scannedBarcode}</span> isn't in the catalog yet. Name it to add stock.
          </p>

          <div className="worker-field">
            <label>Item name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Blue cotton t-shirt"
              autoFocus
            />
          </div>
          <div className="worker-field">
            <label>Category (optional)</label>
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="e.g. Apparel"
            />
          </div>

          <div className="worker-amount">
            <button onClick={() => setAmount((a) => Math.max(1, a - 1))} aria-label="Decrease amount">−</button>
            <span className="mono-num">{amount}</span>
            <button onClick={() => setAmount((a) => a + 1)} aria-label="Increase amount">+</button>
          </div>

          <button
            className="worker-action worker-action--add worker-action--full"
            disabled={busy || !newName.trim()}
            onClick={() => handleAdjust('add')}
          >
            + Add to inventory
          </button>
          <button className="worker-cancel" onClick={reset}>Cancel</button>
        </div>
      )}

      {lookupError && mode === 'idle' && (
        <p className="worker-error">{lookupError}</p>
      )}
    </div>
  );
}
