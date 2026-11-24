import { authFetch } from './http';
import { isDemoMode } from './demo';

export type FilePurpose =
  'INSTALLATION_SITE' | 'INSTALLATION_EQUIPMENT' | 'PAYMENT_PROOF' | 'PROMOTION';

export interface UploadedFile {
  id: string;
  url: string;
  mimeType: string;
  originalName: string;
}

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const acceptedImageTypes = new Set<string>(IMAGE_TYPES);

/** Validates an image locally (type, 5 MB); returns an error message or null. */
export function validateImageFile(file: File): string | null {
  if (!acceptedImageTypes.has(file.type)) return 'La imagen debe estar en formato JPG, PNG o WEBP';
  if (file.size > MAX_FILE_BYTES) return 'La imagen debe pesar 5 MB o menos';
  return null;
}

const DEMO_FILES_KEY = 'unitik-demo-files';
/** Demo images are downscaled so several fit in the ~5 MB localStorage quota. */
const DEMO_MAX_SIDE = 1280;

interface DemoFile extends UploadedFile {
  dataUrl: string;
  purpose: FilePurpose;
}

function readDemoFiles(): Record<string, DemoFile> {
  try {
    return JSON.parse(window.localStorage.getItem(DEMO_FILES_KEY) ?? '{}') as Record<
      string,
      DemoFile
    >;
  } catch {
    return {};
  }
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(blob);
  });
}

async function compressImage(file: File): Promise<string> {
  const source = await readAsDataUrl(file);
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
    image.src = source;
  });
  const scale = Math.min(1, DEMO_MAX_SIDE / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.8);
}

async function uploadDemoFile(file: File, purpose: FilePurpose): Promise<UploadedFile> {
  const isImage = file.type.startsWith('image/');
  const dataUrl = isImage ? await compressImage(file) : await readAsDataUrl(file);
  const id = crypto.randomUUID();
  const stored: DemoFile = {
    id,
    url: `/api/files/${id}`,
    mimeType: isImage ? 'image/jpeg' : file.type,
    originalName: file.name,
    dataUrl,
    purpose,
  };
  const files = readDemoFiles();
  files[id] = stored;
  try {
    window.localStorage.setItem(DEMO_FILES_KEY, JSON.stringify(files));
  } catch {
    throw new Error(
      'El almacenamiento de la demo está lleno. Usa "Restablecer demo" o un archivo más pequeño.',
    );
  }
  return { id, url: stored.url, mimeType: stored.mimeType, originalName: stored.originalName };
}

/** Uploads an image (or PDF proof) and returns its id to link it to a record. */
export async function uploadFile(file: File, purpose: FilePurpose): Promise<UploadedFile> {
  if (file.size > MAX_FILE_BYTES) throw new Error('El archivo debe pesar 5 MB o menos.');
  if (isDemoMode()) return uploadDemoFile(file, purpose);

  const body = new FormData();
  body.append('purpose', purpose);
  body.append('file', file);
  const response = await authFetch('/files', { method: 'POST', body });
  return (await response.json()) as UploadedFile;
}

/** Extracts the file id from "/api/files/<id>" or returns the value if it already is an id. */
export function fileIdFrom(urlOrId: string): string {
  return urlOrId.split('/').filter(Boolean).pop() ?? urlOrId;
}

/**
 * Returns a URL usable in <img src> / <a href>. Real files need the bearer
 * token, so they are fetched and exposed as an object URL the caller must
 * release with URL.revokeObjectURL when it is a blob: URL.
 */
export async function fileObjectUrl(urlOrId: string): Promise<string> {
  return (await fileObject(urlOrId)).url;
}

/** Like fileObjectUrl but also reports the MIME type (to tell images from PDF proofs). */
export async function fileObject(urlOrId: string): Promise<{ url: string; mimeType: string }> {
  const id = fileIdFrom(urlOrId);
  if (isDemoMode()) {
    const file = readDemoFiles()[id];
    if (!file) throw new Error('El archivo ya no está disponible en esta demo.');
    return { url: file.dataUrl, mimeType: file.mimeType };
  }
  const response = await authFetch(`/files/${encodeURIComponent(id)}`);
  const blob = await response.blob();
  return { url: URL.createObjectURL(blob), mimeType: blob.type };
}

/** Triggers a browser download of an authenticated API resource (e.g. a PDF receipt). */
export async function downloadFromApi(path: string, filename: string): Promise<void> {
  const response = await authFetch(path);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
