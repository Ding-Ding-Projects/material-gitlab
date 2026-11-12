// Custom logo: the uploaded image is decoded and redrawn to a 128 px PNG in this browser (which
// also strips any script or animation from SVG), then kept in site storage. Nothing is sent
// anywhere.

export const LOGO_IMAGE_STORAGE_KEY = 'material-system.logo-image.v1';
export const LOGO_ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
export const LOGO_MAX_BYTES = 5 * 1024 * 1024;

export async function logoFileToPng(file, { size = 128, doc = document } = {}) {
  if (!file || !LOGO_ACCEPT.includes(file.type)) return { ok: false, reason: 'type' };
  if (file.size <= 0 || file.size > LOGO_MAX_BYTES) return { ok: false, reason: 'size' };
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('decode'));
      img.src = url;
    });
    const canvas = doc.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const scale = Math.min(
      size / (image.naturalWidth || size),
      size / (image.naturalHeight || size),
    );
    const w = (image.naturalWidth || size) * scale;
    const h = (image.naturalHeight || size) * scale;
    ctx.drawImage(image, (size - w) / 2, (size - h) / 2, w, h);
    return { ok: true, dataUrl: canvas.toDataURL('image/png') };
  } catch (_error) {
    return { ok: false, reason: 'decode' };
  } finally {
    URL.revokeObjectURL(url);
  }
}
