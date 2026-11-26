const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;

export function isValidHexColor(val: string): boolean {
  return HEX_RE.test(val.trim());
}

export function sanitizeHexColor(val: string, fallback: string): string {
  const trimmed = val.trim();
  return HEX_RE.test(trimmed) ? trimmed : fallback;
}

export function isValidDocId(id: string): boolean {
  return ID_RE.test(id);
}

export function makeSafeDocId(prefix: string, label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${slug || 'item'}-${rand}`.slice(0, 80);
}

export function isSafeAssetOrUrl(val: string, maxLen: number): boolean {
  const v = val.trim();
  if (!v || v.length > maxLen) return false;
  return (
    v.startsWith('https://') ||
    v.startsWith('/') ||
    /^data:image\/(png|jpeg|jpg|webp);base64,/.test(v)
  );
}

export function isSafeOptionalUrl(val: string, maxLen: number): boolean {
  const v = val.trim();
  if (v.length > maxLen) return false;
  return v.length === 0 || v.startsWith('https://');
}

/**
 * Compresses an uploaded image file to a lightweight WebP/JPEG data URL
 * guaranteed to fit within Firestore document size limits.
 */
export async function compressImageFile(
  file: File,
  maxWidth = 1280,
  maxChars = 320000
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a valid image file (PNG, JPG, or WebP).');
  }

  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not decode the selected image.'));
      el.src = bitmapUrl;
    });

    const scale = Math.min(1, maxWidth / Math.max(1, img.width));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable.');
    ctx.drawImage(img, 0, 0, width, height);

    const qualities = [0.84, 0.72, 0.6, 0.48];
    for (const q of qualities) {
      const webp = canvas.toDataURL('image/webp', q);
      if (webp.startsWith('data:image/webp') && webp.length <= maxChars) {
        return webp;
      }
      const jpeg = canvas.toDataURL('image/jpeg', q);
      if (jpeg.length <= maxChars) {
        return jpeg;
      }
    }

    // Fallback: downscale further
    canvas.width = Math.max(1, Math.round(width * 0.65));
    canvas.height = Math.max(1, Math.round(height * 0.65));
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const smallJpeg = canvas.toDataURL('image/jpeg', 0.62);
    if (smallJpeg.length <= maxChars) {
      return smallJpeg;
    }

    throw new Error('Image is too large even after compression. Please use a smaller file or image URL.');
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}
