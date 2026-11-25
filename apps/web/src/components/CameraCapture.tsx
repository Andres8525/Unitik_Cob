import { Camera, ImageUp, LoaderCircle, RefreshCw, RotateCcw, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cameraErrorMessage, snapshotFileName, snapshotSize } from './camera';

interface CameraCaptureProps {
  title?: string;
  onCapture: (file: File) => void;
  onClose: () => void;
  /** Offered when the camera cannot be opened. */
  onImportInstead?: () => void;
}

type Facing = 'environment' | 'user';

/** In-page camera dialog: live preview, take the photo, review it and use it or retake it. */
export default function CameraCapture({
  title = 'Tomar foto',
  onCapture,
  onClose,
  onImportInstead,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<Facing>('environment');
  const [starting, setStarting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shot, setShot] = useState<{ file: File; url: string } | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (shot) return;
    let cancelled = false;
    setStarting(true);
    setError(null);
    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(cameraErrorMessage(reason));
      })
      .finally(() => {
        if (!cancelled) setStarting(false);
      });
    return () => {
      cancelled = true;
      stop();
    };
  }, [facing, shot, stop]);

  useEffect(() => () => (shot ? URL.revokeObjectURL(shot.url) : undefined), [shot]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const take = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const size = snapshotSize(video.videoWidth, video.videoHeight);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    canvas.getContext('2d')?.drawImage(video, 0, 0, size.width, size.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError('No se pudo tomar la foto. Inténtalo de nuevo.');
          return;
        }
        const file = new File([blob], snapshotFileName(), { type: 'image/jpeg' });
        stop();
        setShot({ file, url: URL.createObjectURL(blob) });
      },
      'image/jpeg',
      0.88,
    );
  };

  const confirm = () => {
    if (!shot) return;
    onCapture(shot.file);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="flex items-center gap-2 font-bold text-slate-900">
            <Camera className="h-5 w-5 text-unitik-600" aria-hidden="true" />
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="Cerrar cámara"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="relative flex aspect-video items-center justify-center bg-slate-900">
          {shot ? (
            <img src={shot.url} alt="Foto tomada" className="h-full w-full object-contain" />
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`h-full w-full object-contain ${error ? 'hidden' : ''}`}
            />
          )}
          {starting && !shot && !error && (
            <span className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-white">
              <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /> Abriendo cámara…
            </span>
          )}
          {error && (
            <div role="alert" className="max-w-sm px-6 text-center text-sm text-white">
              <p>{error}</p>
              {onImportInstead && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onImportInstead();
                  }}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 font-semibold text-slate-900 hover:bg-slate-100"
                >
                  <ImageUp className="h-4 w-4" aria-hidden="true" /> Importar imagen
                </button>
              )}
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          {shot ? (
            <>
              <button
                type="button"
                onClick={() => setShot(null)}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Repetir
              </button>
              <button
                type="button"
                onClick={confirm}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-unitik-600 px-4 text-sm font-semibold text-white hover:bg-unitik-700"
              >
                Usar esta foto
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() =>
                  setFacing((current) => (current === 'environment' ? 'user' : 'environment'))
                }
                disabled={starting || Boolean(error)}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" /> Cambiar cámara
              </button>
              <button
                type="button"
                onClick={take}
                disabled={starting || Boolean(error)}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-unitik-600 px-4 text-sm font-semibold text-white hover:bg-unitik-700 disabled:opacity-50"
              >
                <Camera className="h-4 w-4" aria-hidden="true" /> Capturar
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
