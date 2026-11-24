import { ImageOff, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fileObjectUrl } from '../api/files';

interface SecureImageProps {
  /** "/api/files/<id>" or the bare file id. */
  src: string;
  alt: string;
  className?: string;
}

/** Renders an image served by the authenticated files API (or the demo store). */
export default function SecureImage({ src, alt, className = '' }: SecureImageProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let created: string | null = null;
    setObjectUrl(null);
    setFailed(false);
    fileObjectUrl(src)
      .then((url) => {
        if (url.startsWith('blob:')) created = url;
        if (active) setObjectUrl(url);
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
      <div
        className={`flex items-center justify-center gap-2 bg-slate-100 text-xs text-slate-500 ${className}`}
        role="img"
        aria-label={`${alt} (no disponible)`}
      >
        <ImageOff className="h-4 w-4" aria-hidden="true" />
        Imagen no disponible
      </div>
    );
  }
  if (!objectUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 ${className}`}
        aria-busy="true"
      >
        <LoaderCircle className="h-5 w-5 animate-spin text-slate-400" aria-hidden="true" />
      </div>
    );
  }
  return <img src={objectUrl} alt={alt} className={`object-cover ${className}`} />;
}
