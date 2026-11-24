import { Camera, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { IMAGE_TYPES, MAX_FILE_BYTES } from '../api/files';

interface ImageUploadFieldProps {
  label: string;
  hint?: string;
  value: File | null;
  onChange: (file: File | null) => void;
  error?: string;
  disabled?: boolean;
}

const acceptedTypes = new Set<string>(IMAGE_TYPES);

/** Validates an image locally (type, 5 MB); returns an error message or null. */
export function validateImageFile(file: File): string | null {
  if (!acceptedTypes.has(file.type)) return 'La imagen debe estar en formato JPG, PNG o WEBP';
  if (file.size > MAX_FILE_BYTES) return 'La imagen debe pesar 5 MB o menos';
  return null;
}

/** Image picker with preview; on phones it can open the camera directly. */
export default function ImageUploadField({
  label,
  hint,
  value,
  onChange,
  error,
  disabled,
}: ImageUploadFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const pick = (file: File | undefined) => {
    if (!file) return;
    const problem = validateImageFile(file);
    setLocalError(problem);
    onChange(problem ? null : file);
  };

  const clear = () => {
    setLocalError(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const message = localError ?? error;

  return (
    <div>
      <span className="block text-sm font-medium text-slate-700">{label}</span>
      {preview ? (
        <div className="relative mt-1 overflow-hidden rounded-xl border border-slate-200">
          <img src={preview} alt={`Vista previa: ${label}`} className="h-44 w-full object-cover" />
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-xs font-semibold text-red-700 shadow hover:bg-white"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" /> Quitar
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={`mt-1 flex h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 text-center transition ${
            message
              ? 'border-red-300 bg-red-50'
              : 'border-slate-300 bg-slate-50 hover:border-unitik-500 hover:bg-unitik-50'
          } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
        >
          <Camera className="h-6 w-6 text-unitik-600" aria-hidden="true" />
          <span className="mt-2 text-sm font-semibold text-slate-800">Tomar o subir foto</span>
          <span className="mt-1 text-xs text-slate-500">
            {hint ?? 'JPG, PNG o WEBP · Máximo 5 MB'}
          </span>
        </label>
      )}
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={IMAGE_TYPES.join(',')}
        capture="environment"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => pick(event.target.files?.[0])}
      />
      {message && <span className="mt-1 block text-xs text-red-600">{message}</span>}
    </div>
  );
}
