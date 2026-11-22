/**
 * Compresses an uploaded image File or DataURL into a lightweight PNG/JPEG Data URL
 * suitable for cloud sync within Firestore string bounds (< 150 KB).
 */
export async function compressImageDataUrl(
  input: File | string,
  maxDimension = 420,
  quality = 0.82
): Promise<string> {
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
    return dataUrl.slice(0, 2000);
  }

  // Keep SVG barcodes/QRs untouched if already compact
  if (dataUrl.startsWith('data:image/svg+xml') && dataUrl.length < 180000) {
    return dataUrl;
  }

  return await new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl.slice(0, 200000));
        return;
      }

      // White background for JPEG or keep PNG for QR clarity
      const isQrLike = width <= 320 && height <= 320;
      if (!isQrLike) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      let out = isQrLike ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', quality);
      if (out.length > 180000) {
        out = canvas.toDataURL('image/jpeg', 0.65);
      }
      resolve(out);
    };
    img.onerror = () => resolve(dataUrl.slice(0, 180000));
    img.src = dataUrl;
  });
}
