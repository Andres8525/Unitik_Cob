import { ExternalLink, FileText, ImageOff, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fileObject } from '../api/files';

/** Shows a payment proof: inline image, or an "open PDF" card for PDF statements. */
export default function ProofViewer({ src, label }: { src: string; label: string }) {
  const [file, setFile] = useState<{ url: string; mimeType: string } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let created: string | null = null;
    setFile(null);
    setFailed(false);
    fileObject(src)
      .then((result) => {
        if (result.url.startsWith('blob:')) created = result.url;
        if (active) setFile(result);
        else if (created) URL.revokeObjectURL(created);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [src]);

  if (failed) {
    return (
      <div className="flex h-48 items-center justify-center gap-2 rounded-xl bg-slate-100 text-sm text-slate-500">
        <ImageOff className="h-4 w-4" aria-hidden="true" /> Comprobante no disponible
      </div>
    );
  }
  if (!file) {
    return (
      <div
        className="flex h-48 items-center justify-center rounded-xl bg-slate-100"
        aria-busy="true"
      >
        <LoaderCircle className="h-5 w-5 animate-spin text-slate-400" aria-hidden="true" />
      </div>
    );
  }

  const isPdf = file.mimeType === 'application/pdf';
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
      {isPdf ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 bg-slate-50 text-sm text-slate-600">
          <FileText className="h-8 w-8 text-unitik-600" aria-hidden="true" />
          Comprobante en PDF
        </div>
      ) : (
        <img src={file.url} alt={label} className="h-48 w-full bg-slate-50 object-contain" />
      )}
      <a
        href={file.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1 border-t border-slate-200 bg-white py-2 text-xs font-semibold text-unitik-700 hover:bg-unitik-50"
      >
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        {isPdf ? 'Abrir PDF' : 'Ver en tamaño completo'}
      </a>
    </div>
  );
}
