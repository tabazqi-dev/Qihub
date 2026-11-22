/**
 * Compresses an uploaded image File or DataURL into a lightweight Data URL
 * safely under PostgreSQL / API payload limits (< 180 KB).
 */
export async function compressImageDataUrl(
  input: File | string,
  maxDimension = 420,
  quality = 0.82
): Promise<string> {
  // Normalize accidental byte-limit numbers passed as 3rd arg (e.g. 140000 -> 0.82)
  const safeQuality = quality > 1 ? 0.82 : Math.min(0.95, Math.max(0.2, quality));

  const dataUrl =
    typeof input === 'string'
      ? input
      : await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
          reader.readAsDataURL(input);
        });

  if (!dataUrl.startsWith('data:image/')) {
    throw new Error('Format file harus berupa gambar');
  }

  // Keep SVG barcodes/QRs untouched if already compact
  if (dataUrl.startsWith('data:image/svg+xml') && dataUrl.length < 180000) {
    return dataUrl;
  }

  const loadedImg = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('File gambar tidak dapat diproses oleh browser'));
    img.src = dataUrl;
  });

  const maxTargetLen = 180000;
  let currentDim = maxDimension;
  let currentQ = safeQuality;
  const isQrInput = typeof input === 'string' && maxDimension <= 320;

  for (let attempt = 0; attempt < 4; attempt++) {
    let width = loadedImg.naturalWidth || loadedImg.width || currentDim;
    let height = loadedImg.naturalHeight || loadedImg.height || currentDim;

    if (width > currentDim || height > currentDim) {
      if (width >= height) {
        height = Math.round((height * currentDim) / width);
        width = currentDim;
      } else {
        width = Math.round((width * currentDim) / height);
        height = currentDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, width);
    canvas.height = Math.max(1, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      if (dataUrl.length <= 240000) return dataUrl;
      throw new Error('Canvas tidak tersedia');
    }

    if (!isQrInput) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(loadedImg, 0, 0, canvas.width, canvas.height);

    let out = isQrInput
      ? canvas.toDataURL('image/png')
      : canvas.toDataURL('image/jpeg', currentQ);

    if (out.length <= maxTargetLen) {
      return out;
    }

    // Try JPEG compression if PNG was too big
    out = canvas.toDataURL('image/jpeg', Math.max(0.45, currentQ - 0.2));
    if (out.length <= maxTargetLen) {
      return out;
    }

    currentDim = Math.max(160, Math.round(currentDim * 0.72));
    currentQ = Math.max(0.4, currentQ - 0.15);
  }

  // Final aggressive fallback guaranteed under 240KB
  const fallbackCanvas = document.createElement('canvas');
  fallbackCanvas.width = 200;
  fallbackCanvas.height = 200;
  const fCtx = fallbackCanvas.getContext('2d');
  if (fCtx) {
    fCtx.fillStyle = '#ffffff';
    fCtx.fillRect(0, 0, 200, 200);
    fCtx.drawImage(loadedImg, 0, 0, 200, 200);
    return fallbackCanvas.toDataURL('image/jpeg', 0.65);
  }

  throw new Error('Ukuran gambar terlalu besar');
}
