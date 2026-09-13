'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createBarcodeDetector,
  normalizeDetectedBarcode,
  scanBarcodeFrame,
} from '@/lib/barcode-scanner';

export function BarcodeScanner({
  open,
  onDetected,
  onCancel,
}: {
  open: boolean;
  onDetected: (barcode: string) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lockedRef = useRef(false);
  const [manualCode, setManualCode] = useState('');
  const [message, setMessage] = useState('');
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let timer: number | undefined;
    const detector = createBarcodeDetector();

    function stopCamera() {
      if (timer !== undefined) window.clearTimeout(timer);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setCameraReady(false);
    }

    async function startCamera() {
      if (!detector || !navigator.mediaDevices?.getUserMedia) {
        setMessage(
          'Tu navegador no permite escaneo automático. Ingresá el código manualmente.',
        );
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setCameraReady(true);
        const scan = async () => {
          if (cancelled || lockedRef.current) return;
          try {
            const barcode = await scanBarcodeFrame(detector, video);
            if (barcode) {
              lockedRef.current = true;
              stopCamera();
              onDetected(barcode);
              return;
            }
          } catch {
            setMessage(
              'No pudimos leer el código. También podés ingresarlo manualmente.',
            );
          }
          timer = window.setTimeout(() => void scan(), 160);
        };
        void scan();
      } catch {
        setMessage(
          'No se pudo acceder a la cámara. Ingresá el código manualmente.',
        );
      }
    }

    lockedRef.current = false;
    window.setTimeout(() => {
      if (!cancelled) setMessage('');
    }, 0);
    void startCamera();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [onDetected, open]);

  if (!open) return null;

  function submitManual(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const barcode = normalizeDetectedBarcode(manualCode);
    if (!barcode) {
      setMessage('El código debe tener entre 8 y 14 dígitos.');
      return;
    }
    onDetected(barcode);
  }

  return (
    <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
      <p className="font-semibold text-slate-900">Escanear producto</p>
      {cameraReady && (
        <video
          aria-label="Vista previa de la cámara"
          className="mt-3 aspect-video w-full rounded-lg bg-slate-900 object-cover"
          muted
          playsInline
          ref={videoRef}
        />
      )}
      <p className="mt-2 text-sm text-slate-600">
        Apuntá al código de barras o ingresalo manualmente. No se guarda ninguna
        imagen.
      </p>
      <form className="mt-3 flex gap-2" onSubmit={submitManual}>
        <input
          aria-label="Código de barras"
          className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3"
          inputMode="numeric"
          maxLength={14}
          onChange={(event) => setManualCode(event.target.value)}
          placeholder="7791234567890"
          value={manualCode}
        />
        <button
          className="min-h-10 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white"
          type="submit"
        >
          Usar código
        </button>
      </form>
      {message && (
        <p className="mt-2 text-sm text-rose-700" role="alert">
          {message}
        </p>
      )}
      <button
        className="mt-3 text-sm font-semibold text-slate-600"
        onClick={onCancel}
        type="button"
      >
        Cancelar
      </button>
    </div>
  );
}
