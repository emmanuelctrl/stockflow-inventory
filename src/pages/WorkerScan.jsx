import { useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import BarcodeScanner from '../components/BarcodeScanner';
import { api } from '../lib/api';
import './WorkerScan.css';

// Modes: 'idle' -> scanner running, listening for a code
// 'confirm' -> a known product was found, show remove-stock controls
// 'unknown' -> barcode isn't in the catalog; worker can't add it themselves
export default function WorkerScan() {
  const [mode, setMode] = useState('idle');
  const [scannedBarcode, setScannedBarcode] = useState(null);
  const [product, setProduct] = useState(null);
  const [amount, setAmount] = useState(1);
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
    if (mode !== 'idle') return; // ignore scans while a sheet is open
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
        setMode('unknown');
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

  async function handleRemove() {
    setBusy(true);
    try {
      const res = await api.scanAdjust({
        barcode: scannedBarcode,
        type: 'remove',
        amount
      });
      showToast(`${amount} removed · ${res.product.quantity} in stock`, 'warning');
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
        <span className="worker-header-title">Scan to remove stock</span>
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
        <div className="worker-sheet" role="dialog" aria-label="Confirm stock removal">
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

          <button className="worker-action worker-action--remove worker-action--full" disabled={busy} onClick={handleRemove}>
            − Remove stock
          </button>

          <button className="worker-cancel" onClick={reset}>Cancel</button>
        </div>
      )}

      {mode === 'unknown' && (
        <div className="worker-sheet" role="dialog" aria-label="Item not in catalog">
          <div className="worker-sheet-handle" />
          <h2>Not in the catalog</h2>
          <p className="worker-sheet-sub">
            <span className="mono-num">{scannedBarcode}</span> hasn't been added to inventory yet.
            Ask the owner to add it before it can be scanned out.
          </p>
          <button className="worker-cancel worker-cancel--prominent" onClick={reset}>Got it</button>
        </div>
      )}

      {lookupError && mode === 'idle' && (
        <p className="worker-error">{lookupError}</p>
      )}
    </div>
  );
}
