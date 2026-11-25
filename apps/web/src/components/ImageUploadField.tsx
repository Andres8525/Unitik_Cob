import { ImageIcon, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { IMAGE_TYPES, validateImageFile } from '../api/files';
import ImageSourceButtons from './ImageSourceButtons';

interface ImageUploadFieldProps {
  label: string;
  hint?: string;
  value: File | null;
  onChange: (file: File | null) => void;
  error?: string;
  disabled?: boolean;
}

/** Image field with preview and two actions: "Abrir cámara" and "Importar imagen". */
export default function ImageUploadField({
  label,
  hint,
  value,
  onChange,
  error,
  disabled,
}: ImageUploadFieldProps) {
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

  const pick = (file: File) => {
    const problem = validateImageFile(file);
    setLocalError(problem);
    onChange(problem ? null : file);
  };

  const clear = () => {
    setLocalError(null);
    onChange(null);
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
        <div
          className={`mt-1 flex h-32 flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 text-center ${
            message ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-slate-50'
          } ${disabled ? 'opacity-60' : ''}`}
        >
          <ImageIcon className="h-6 w-6 text-unitik-600" aria-hidden="true" />
          <span className="mt-2 text-sm font-semibold text-slate-800">Sin foto</span>
          <span className="mt-1 text-xs text-slate-500">
            {hint ?? 'JPG, PNG o WEBP · Máximo 5 MB'}
          </span>
        </div>
      )}
      <div className="mt-2">
        <ImageSourceButtons
          onFile={pick}
          accept={IMAGE_TYPES.join(',')}
          disabled={disabled}
          cameraTitle={label}
        />
      </div>
      {message && <span className="mt-1 block text-xs text-red-600">{message}</span>}
    </div>
  );
}
