/** Shrink a photo before upload: longest side ≤ maxSide, JPEG. Falls back to the original on any failure. */
export async function compressImage(file: Blob, maxSide = 1600, quality = 0.8): Promise<Blob> {
  try {
    if (!/^image\//.test(file.type) || /gif/.test(file.type)) return file;
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality));
    return out && out.size < file.size ? out : file;
  } catch {
    return file;
  }
}
