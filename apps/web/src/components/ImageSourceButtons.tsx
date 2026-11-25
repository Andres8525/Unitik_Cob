import { Camera, ImageUp } from 'lucide-react';
import { useRef, useState } from 'react';
import CameraCapture from './CameraCapture';
import { canUseInPageCamera, prefersNativeCamera } from './camera';

interface ImageSourceButtonsProps {
  /** Receives the photo taken or the file imported. */
  onFile: (file: File) => void;
  /** MIME types accepted by "Importar imagen" (camera photos are always JPEG). */
  accept: string;
  disabled?: boolean;
  cameraTitle?: string;
  importLabel?: string;
  /** Lets a form register the import input (e.g. react-hook-form focus on error). */
  importInputRef?: (element: HTMLInputElement | null) => void;
  name?: string;
  onBlur?: () => void;
}

const buttonBase =
  'inline-flex min-h-11 flex-1 basis-40 items-center whitespace-nowrap justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-unitik-100 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Two explicit actions for attaching a picture: "Abrir cámara" and "Importar imagen".
 * On phones the camera button opens the native camera app; on computers it opens an
 * in-page camera dialog. If no camera is available the user can still import a file.
 */
export default function ImageSourceButtons({
  onFile,
  accept,
  disabled,
  cameraTitle,
  importLabel = 'Importar imagen',
  importInputRef,
  name,
  onBlur,
}: ImageSourceButtonsProps) {
  const cameraInput = useRef<HTMLInputElement | null>(null);
  const importInput = useRef<HTMLInputElement | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const openCamera = () => {
    if (prefersNativeCamera() || !canUseInPageCamera()) {
      cameraInput.current?.click();
      return;
    }
    setCameraOpen(true);
  };

  const openImport = () => importInput.current?.click();

  const take = (input: HTMLInputElement) => {
    const file = input.files?.[0];
    input.value = '';
    if (file) onFile(file);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={openCamera}
          disabled={disabled}
          className={`${buttonBase} bg-unitik-600 text-white hover:bg-unitik-700`}
        >
          <Camera className="h-4 w-4" aria-hidden="true" /> Abrir cámara
        </button>
        <button
          type="button"
          onClick={openImport}
          disabled={disabled}
          className={`${buttonBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
        >
          <ImageUp className="h-4 w-4" aria-hidden="true" /> {importLabel}
        </button>
      </div>
      <input
        ref={cameraInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
        onChange={(event) => take(event.currentTarget)}
      />
      <input
        ref={(element) => {
          importInput.current = element;
          importInputRef?.(element);
        }}
        type="file"
        accept={accept}
        name={name}
        onBlur={onBlur}
        className="sr-only"
        tabIndex={-1}
        aria-label={importLabel}
        disabled={disabled}
        onChange={(event) => take(event.currentTarget)}
      />
      {cameraOpen && (
        <CameraCapture
          title={cameraTitle}
          onCapture={onFile}
          onClose={() => setCameraOpen(false)}
          onImportInstead={openImport}
        />
      )}
    </>
  );
}
