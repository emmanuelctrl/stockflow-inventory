import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import './BarcodeScanner.css';

export default function BarcodeScanner({ onDetected, paused }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const lastCodeRef = useRef({ code: null, time: 0 });
  const [cameraError, setCameraError] = useState(null);
  const [ready, setReady] = useState(false);

  const handleResult = useCallback(
    (code) => {
      const now = Date.now();
      // Debounce: ignore the same code if scanned again within 2.5s
      if (lastCodeRef.current.code === code && now - lastCodeRef.current.time < 2500) {
        return;
      }
      lastCodeRef.current = { code, time: now };
      onDetected(code);
    },
    [onDetected]
  );

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    let stopped = false;

    async function start() {
      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (devices.length === 0) {
          setCameraError('No camera found on this device.');
          return;
        }
        // Prefer a back/environment-facing camera if labeled as such
        const backCamera = devices.find((d) => /back|environment|rear/i.test(d.label));
        const deviceId = (backCamera || devices[devices.length - 1]).deviceId;

        await reader.decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
          if (stopped) return;
          if (result) {
            handleResult(result.getText());
          } else if (err && !(err instanceof NotFoundException)) {
            // Non-fatal per-frame errors are expected constantly while no code is in view; ignore.
          }
        });
        setReady(true);
      } catch (err) {
        setCameraError(
          err?.name === 'NotAllowedError'
            ? 'Camera access was denied. Allow camera permissions in your browser settings to scan.'
            : 'Could not start the camera. Make sure no other app is using it.'
        );
      }
    }

    start();

    return () => {
      stopped = true;
      try {
        reader.reset();
      } catch {
        // ignore cleanup errors
      }
    };
  }, [handleResult]);

  return (
    <div className="scanner">
      <video ref={videoRef} className="scanner-video" muted playsInline />
      {!ready && !cameraError && (
        <div className="scanner-overlay scanner-overlay--loading">
          <p>Starting camera…</p>
        </div>
      )}
      {cameraError && (
        <div className="scanner-overlay scanner-overlay--error">
          <p>{cameraError}</p>
        </div>
      )}
      {ready && !cameraError && (
        <div className={`scanner-frame ${paused ? 'scanner-frame--paused' : ''}`}>
          <span className="scanner-corner scanner-corner--tl" />
          <span className="scanner-corner scanner-corner--tr" />
          <span className="scanner-corner scanner-corner--bl" />
          <span className="scanner-corner scanner-corner--br" />
          {!paused && <div className="scanner-laser" />}
        </div>
      )}
    </div>
  );
}
