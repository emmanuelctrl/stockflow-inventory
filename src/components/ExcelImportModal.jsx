import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../lib/api';
import './ExcelImportModal.css';

const EXPECTED_COLUMNS = ['name', 'barcode', 'sku', 'quantity', 'category', 'unit_price', 'low_stock_threshold'];

export default function ExcelImportModal({ token, onClose, onImported }) {
  const [preview, setPreview] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [fileError, setFileError] = useState(null);
  const inputRef = useRef();

  function handleFile(e) {
    setFileError(null);
    setPreview(null);
    setParsed(null);
    setResult(null);

    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (rows.length === 0) {
          setFileError('The spreadsheet is empty.');
          return;
        }

        // Normalize column headers (lowercase, trim, replace spaces with _)
        const normalized = rows.map((row) => {
          const out = {};
          for (const [k, v] of Object.entries(row)) {
            const key = k.trim().toLowerCase().replace(/\s+/g, '_');
            out[key] = v;
          }
          return {
            name: String(out.name || out.product_name || '').trim(),
            barcode: String(out.barcode || out.barcode_number || out.ean || out.upc || '').trim(),
            sku: String(out.sku || '').trim(),
            quantity: Number(out.quantity || out.qty || 0),
            category: String(out.category || 'General').trim(),
            unitPrice: Number(out.unit_price || out.price || 0),
            lowStockThreshold: Number(out.low_stock_threshold || out.low_stock || 5),
          };
        });

        const valid = normalized.filter((r) => r.name && r.barcode);
        setPreview(normalized.slice(0, 5));
        setParsed(valid);

        if (valid.length === 0) {
          setFileError('No valid rows found. Make sure your sheet has "name" and "barcode" columns.');
        }
      } catch {
        setFileError('Could not read the file. Please upload a valid .xlsx or .xls file.');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleImport() {
    if (!parsed || parsed.length === 0) return;
    setImporting(true);
    try {
      const res = await api.importProducts(token, parsed.map((p) => ({
        name: p.name,
        barcode: p.barcode,
        sku: p.sku,
        quantity: p.quantity,
        category: p.category,
        unitPrice: p.unitPrice,
        lowStockThreshold: p.lowStockThreshold,
      })));
      setResult(res);
      if (res.inserted > 0) onImported();
    } catch (err) {
      setFileError(err.message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="import-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="import-modal">
        <div className="import-header">
          <h2>Import from Excel</h2>
          <button className="import-close" onClick={onClose}>✕</button>
        </div>

        {!result ? (
          <>
            <p className="import-hint">
              Upload an <strong>.xlsx</strong> or <strong>.xls</strong> file. Required columns: <code>name</code>, <code>barcode</code>.
              Optional: <code>sku</code>, <code>quantity</code>, <code>category</code>, <code>unit_price</code>, <code>low_stock_threshold</code>.
            </p>

            <div className="import-dropzone" onClick={() => inputRef.current.click()}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 16V4m0 0L8 8m4-4l4 4" />
                <path d="M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
              </svg>
              <span>Click to choose file</span>
              <span className="import-dropzone-sub">.xlsx or .xls</span>
              <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleFile} hidden />
            </div>

            {fileError && <p className="import-error">{fileError}</p>}

            {preview && preview.length > 0 && (
              <div className="import-preview">
                <p className="import-preview-label">Preview (first {preview.length} rows) — {parsed.length} valid rows total</p>
                <div className="import-table-wrap">
                  <table className="import-table">
                    <thead>
                      <tr>
                        <th>Name</th><th>Barcode</th><th>SKU</th><th>Qty</th><th>Category</th><th>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((r, i) => (
                        <tr key={i} className={!r.name || !r.barcode ? 'row-invalid' : ''}>
                          <td>{r.name || <span className="missing">missing</span>}</td>
                          <td className="mono">{r.barcode || <span className="missing">missing</span>}</td>
                          <td className="dim">{r.sku || '—'}</td>
                          <td className="num">{r.quantity}</td>
                          <td className="dim">{r.category}</td>
                          <td className="num">${r.unitPrice.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="import-actions">
              <button className="import-cancel" onClick={onClose}>Cancel</button>
              <button
                className="import-confirm"
                onClick={handleImport}
                disabled={!parsed || parsed.length === 0 || importing}
              >
                {importing ? 'Importing…' : `Import ${parsed?.length ?? 0} products`}
              </button>
            </div>
          </>
        ) : (
          <div className="import-result">
            <div className="result-icon">✓</div>
            <p className="result-main">Import complete</p>
            <ul className="result-stats">
              <li><strong>{result.inserted}</strong> products added</li>
              {result.skipped > 0 && <li><strong>{result.skipped}</strong> skipped (barcode already exists)</li>}
              {result.errors.length > 0 && <li><strong>{result.errors.length}</strong> errors</li>}
            </ul>
            {result.errors.length > 0 && (
              <ul className="result-errors">
                {result.errors.map((e, i) => <li key={i}>{e.row}: {e.reason}</li>)}
              </ul>
            )}
            <button className="import-confirm" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
