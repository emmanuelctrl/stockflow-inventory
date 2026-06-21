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
      // Camera access requires a secure context (HTTPS or localhost). On plain
      // HTTP, navigator.mediaDevices is simply undefined in most browsers.
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          window.isSecureContext === false
            ? 'Camera access needs a secure connection (https://). This page is loading over http://.'
            : 'This browser does not support camera access.'
        );
        return;
      }

      try {
        const devices = await reader.listVideoInputDevices();
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
        const name = err?.name;
        const messages = {
          NotAllowedError: 'Camera access was denied. Allow camera permissions in your browser settings to scan.',
          NotFoundError: 'No camera was found on this device.',
          NotReadableError: 'Could not start the camera — it may be in use by another app or tab.',
          OverconstrainedError: 'No camera matched the requested settings.',
          SecurityError: 'Camera access was blocked because this page is not running over https://.',
          AbortError: 'Camera access was interrupted before it could start.'
        };
        // Always show the real error name/message too, so a mismatch is easy to spot.
        const friendly = messages[name];
        setCameraError(friendly ? `${friendly} (${name})` : `Could not start the camera: ${err?.message || String(err)}`);
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
