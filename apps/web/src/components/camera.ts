/** Helpers shared by the "Abrir cámara" flow (in-browser camera or native phone camera). */

/** True when the browser can stream the camera inside the page (needs HTTPS or localhost). */
export function canUseInPageCamera(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    (typeof window === 'undefined' || window.isSecureContext !== false)
  );
}

/**
 * Phones and tablets have a better native camera app (focus, flash, HDR), so on touch-first
 * devices the camera button opens it through `<input capture>` instead of the in-page dialog.
 */
export function prefersNativeCamera(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

/** Friendly Spanish message for getUserMedia failures. */
export function cameraErrorMessage(error: unknown): string {
  const name = error instanceof Error || error instanceof DOMException ? error.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'No se dio permiso para usar la cámara. Habilítalo en el navegador o importa una imagen.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No se encontró una cámara en este equipo. Importa una imagen desde tus archivos.';
    case 'NotReadableError':
    case 'AbortError':
      return 'La cámara está siendo usada por otra aplicación. Ciérrala e inténtalo de nuevo.';
    default:
      return 'No se pudo abrir la cámara. Puedes importar una imagen desde tus archivos.';
  }
}

/** File name for a camera snapshot, e.g. "foto-20261124-153012.jpg". */
export function snapshotFileName(date: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const stamp =
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `foto-${stamp}.jpg`;
}

/** Fits a video frame into maxSide pixels keeping its aspect ratio. */
export function snapshotSize(
  width: number,
  height: number,
  maxSide = 1920,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}
