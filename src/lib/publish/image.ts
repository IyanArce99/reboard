// Fotos en el navegador antes de subirlas (E2): orientación correcta, máximo 1600 px y WebP.
// Volver a codificar en un canvas descarta TODOS los metadatos (EXIF, GPS, modelo de cámara).
// Si el navegador no sabe codificar WebP (algunos Safari), se usa JPEG, también sin metadatos.

export const MAX_SIDE = 1600;
const QUALITY = 0.82;

export interface ProcessedPhoto {
  blob: Blob;
  width: number;
  height: number;
  type: "image/webp" | "image/jpeg";
}

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Formatos que createImageBitmap no abre: se intenta con <img>.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Redimensiona y recodifica una foto. Lanza un error si el formato no se puede abrir (p. ej., HEIC en Chrome). */
export async function processPhoto(file: Blob): Promise<ProcessedPhoto> {
  const src = await decode(file);
  const w0 = "naturalWidth" in src ? src.naturalWidth : src.width;
  const h0 = "naturalHeight" in src ? src.naturalHeight : src.height;
  if (!w0 || !h0) throw new Error("imagen vacía");
  const k = Math.min(1, MAX_SIDE / Math.max(w0, h0));
  const width = Math.max(1, Math.round(w0 * k));
  const height = Math.max(1, Math.round(h0 * k));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, width, height);
  if ("close" in src) src.close();

  const webp = await toBlob(canvas, "image/webp", QUALITY);
  if (webp && webp.type === "image/webp") return { blob: webp, width, height, type: "image/webp" };
  const jpeg = await toBlob(canvas, "image/jpeg", 0.85);
  if (!jpeg) throw new Error("encode");
  return { blob: jpeg, width, height, type: "image/jpeg" };
}

/** true si los bytes contienen un bloque EXIF (JPEG APP1 «Exif» o chunk «EXIF» de WebP). Para tests. */
export function hasExif(bytes: Uint8Array): boolean {
  const ascii = (i: number, s: string) => [...s].every((c, j) => bytes[i + j] === c.charCodeAt(0));
  for (let i = 0; i < bytes.length - 6; i++) {
    if (ascii(i, "Exif\0\0") || ascii(i, "EXIF")) return true;
  }
  return false;
}
