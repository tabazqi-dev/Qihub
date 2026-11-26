import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { createZipBlob } from '../../utils/zipStore';
import {
  Upload,
  Download,
  Trash2,
  ArrowLeftRight,
  Image as ImageIcon,
  SlidersHorizontal,
  Archive,
  Check,
  RefreshCw,
  Eye,
  X,
  Plus
} from 'lucide-react';

type TargetFormatMode = 'auto_flip' | 'jpg' | 'png' | 'webp';
type OutputFormat = 'jpg' | 'png' | 'webp';

interface ConverterItem {
  id: string;
  fileName: string;
  baseName: string;
  sourceFormat: string;
  sourceMime: string;
  sourceSize: number;
  sourceUrl: string;
  width: number;
  height: number;
  targetFormat: OutputFormat;
  convertedUrl: string | null;
  convertedBlob: Blob | null;
  convertedSize: number;
  convertedWidth: number;
  convertedHeight: number;
  status: 'pending' | 'converting' | 'done' | 'error';
  errorMessage?: string;
}

const MIME_BY_FORMAT: Record<OutputFormat, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const EXT_BY_FORMAT: Record<OutputFormat, string> = {
  jpg: 'jpg',
  png: 'png',
  webp: 'webp',
};

const LABEL_BY_FORMAT: Record<OutputFormat, string> = {
  jpg: 'JPG',
  png: 'PNG',
  webp: 'WebP',
};

function detectSourceFormat(file: File): string {
  const mime = (file.type || '').toLowerCase();
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'JPG';
  if (mime === 'image/png') return 'PNG';
  if (mime === 'image/webp') return 'WebP';
  if (mime === 'image/gif') return 'GIF';
  if (mime === 'image/bmp') return 'BMP';
  if (mime === 'image/svg+xml') return 'SVG';
  if (mime === 'image/avif') return 'AVIF';
  if (mime === 'image/heic' || mime === 'image/heic-sequence') return 'HEIC';
  if (mime === 'image/heif' || mime === 'image/heif-sequence') return 'HEIF';
  const ext = file.name.split('.').pop()?.toUpperCase();
  return ext || 'IMAGE';
}

function isHeicFormat(sourceFormat: string, file?: File): boolean {
  if (sourceFormat === 'HEIC' || sourceFormat === 'HEIF') return true;
  if (!file) return false;
  const mime = (file.type || '').toLowerCase();
  return (
    mime === 'image/heic' ||
    mime === 'image/heic-sequence' ||
    mime === 'image/heif' ||
    mime === 'image/heif-sequence' ||
    /\.(heic|heif)$/i.test(file.name)
  );
}

function resolveTargetFormat(mode: TargetFormatMode, sourceFormat: string): OutputFormat {
  if (mode === 'jpg') return 'jpg';
  if (mode === 'png') return 'png';
  if (mode === 'webp') return 'webp';
  // auto_flip: PNG & HEIC/HEIF -> JPG, others (JPG/WebP/etc.) -> PNG
  return sourceFormat === 'PNG' || sourceFormat === 'HEIC' || sourceFormat === 'HEIF' ? 'jpg' : 'png';
}

function getBaseFileName(name: string): string {
  const lastDot = name.lastIndexOf('.');
  return lastDot > 0 ? name.slice(0, lastDot) : name;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Format gambar tidak dapat dibaca browser'));
    img.src = src;
  });
}

async function prepareReadableSourceUrl(file: File, sourceFormat: string): Promise<{
  sourceUrl: string;
  width: number;
  height: number;
}> {
  const rawUrl = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(rawUrl);
    return {
      sourceUrl: rawUrl,
      width: img.naturalWidth,
      height: img.naturalHeight,
    };
  } catch (err) {
    if (!isHeicFormat(sourceFormat, file)) {
      return { sourceUrl: rawUrl, width: 0, height: 0 };
    }

    // Decode HEIC/HEIF in-browser for non-Safari browsers
    try {
      const { default: heic2any } = await import('heic2any');
      const result = await heic2any({
        blob: file,
        toType: 'image/png',
      });
      const decodedBlob = Array.isArray(result) ? result[0] : result;
      if (!decodedBlob) {
        throw err;
      }
      const decodedUrl = URL.createObjectURL(decodedBlob);
      URL.revokeObjectURL(rawUrl);
      const decodedImg = await loadImageElement(decodedUrl);
      return {
        sourceUrl: decodedUrl,
        width: decodedImg.naturalWidth,
        height: decodedImg.naturalHeight,
      };
    } catch {
      return { sourceUrl: rawUrl, width: 0, height: 0 };
    }
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Gagal memproses gambar pada canvas'));
          return;
        }
        resolve(blob);
      },
      mime,
      quality
    );
  });
}

export const ImageConverterView: React.FC = () => {
  const { showToast } = useApp();

  const [items, setItems] = useState<ConverterItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Conversion Settings
  const [formatMode, setFormatMode] = useState<TargetFormatMode>('auto_flip');
  const [quality, setQuality] = useState<number>(92);
  const [jpgBgColor, setJpgBgColor] = useState<string>('#ffffff');
  const [scalePercent, setScalePercent] = useState<number>(100);
  const [maxWidthPx, setMaxWidthPx] = useState<string>('');
  const [isZipping, setIsZipping] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<ConverterItem[]>([]);
  const conversionTokenRef = useRef<number>(0);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Cleanup Object URLs on unmount
  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => {
        URL.revokeObjectURL(item.sourceUrl);
        if (item.convertedUrl) URL.revokeObjectURL(item.convertedUrl);
      });
    };
  }, []);

  const convertSingleItem = useCallback(
    async (
      item: ConverterItem,
      targetFormat: OutputFormat,
      q: number,
      bgHex: string,
      scalePct: number,
      maxWidthStr: string
    ): Promise<Partial<ConverterItem>> => {
      try {
        const img = await loadImageElement(item.sourceUrl);
        const natW = img.naturalWidth || item.width || 1;
        const natH = img.naturalHeight || item.height || 1;

        let outW = Math.max(1, Math.round((natW * scalePct) / 100));
        let outH = Math.max(1, Math.round((natH * scalePct) / 100));

        const parsedMaxW = parseInt(maxWidthStr, 10);
        if (Number.isFinite(parsedMaxW) && parsedMaxW > 0 && outW > parsedMaxW) {
          const ratio = parsedMaxW / outW;
          outW = parsedMaxW;
          outH = Math.max(1, Math.round(outH * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Context grafis 2D tidak tersedia');

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // JPG does not support alpha transparency; fill backdrop first so transparent PNGs stay clean
        if (targetFormat === 'jpg') {
          ctx.fillStyle = bgHex || '#ffffff';
          ctx.fillRect(0, 0, outW, outH);
        } else {
          ctx.clearRect(0, 0, outW, outH);
        }

        ctx.drawImage(img, 0, 0, outW, outH);

        const mime = MIME_BY_FORMAT[targetFormat];
        const qualityParam = targetFormat === 'png' ? undefined : Math.min(1, Math.max(0.1, q / 100));
        const blob = await canvasToBlob(canvas, mime, qualityParam);
        const convertedUrl = URL.createObjectURL(blob);

        return {
          targetFormat,
          convertedBlob: blob,
          convertedUrl,
          convertedSize: blob.size,
          convertedWidth: outW,
          convertedHeight: outH,
          status: 'done',
          errorMessage: undefined,
        };
      } catch (err) {
        return {
          targetFormat,
          convertedBlob: null,
          convertedUrl: null,
          convertedSize: 0,
          status: 'error',
          errorMessage: err instanceof Error ? err.message : 'Gagal mengonversi gambar',
        };
      }
    },
    []
  );

  // Re-convert whenever global settings change
  const reconvertAll = useCallback(
    async (
      targetList: ConverterItem[],
      mode: TargetFormatMode,
      q: number,
      bgHex: string,
      scalePct: number,
      maxWidthStr: string
    ) => {
      if (targetList.length === 0) return;
      const token = ++conversionTokenRef.current;

      setItems((prev) =>
        prev.map((it) => ({
          ...it,
          targetFormat: resolveTargetFormat(mode, it.sourceFormat),
          status: 'converting',
        }))
      );

      for (const item of targetList) {
        if (conversionTokenRef.current !== token) return;
        const nextFormat = resolveTargetFormat(mode, item.sourceFormat);
        const result = await convertSingleItem(item, nextFormat, q, bgHex, scalePct, maxWidthStr);
        if (conversionTokenRef.current !== token) {
          if (result.convertedUrl) URL.revokeObjectURL(result.convertedUrl);
          return;
        }
        setItems((prev) =>
          prev.map((cur) => {
            if (cur.id !== item.id) return cur;
            if (cur.convertedUrl && cur.convertedUrl !== result.convertedUrl) {
              URL.revokeObjectURL(cur.convertedUrl);
            }
            return { ...cur, ...result };
          })
        );
      }
    },
    [convertSingleItem]
  );

  const handleFilesAdded = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter((f) =>
        f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg|avif|heic|heif)$/i.test(f.name)
      );

      if (files.length === 0) {
        showToast('Pilih berkas gambar yang valid (PNG, JPG, HEIC, WebP, BMP, GIF, SVG)', 'warning');
        return;
      }

      const queuedEntries = files.map((file) => {
        const sourceFormat = detectSourceFormat(file);
        const id = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const item: ConverterItem = {
          id,
          fileName: file.name,
          baseName: getBaseFileName(file.name),
          sourceFormat,
          sourceMime: file.type || (isHeicFormat(sourceFormat, file) ? 'image/heic' : 'image/unknown'),
          sourceSize: file.size,
          sourceUrl: '',
          width: 0,
          height: 0,
          targetFormat: resolveTargetFormat(formatMode, sourceFormat),
          convertedUrl: null,
          convertedBlob: null,
          convertedSize: 0,
          convertedWidth: 0,
          convertedHeight: 0,
          status: 'converting',
        };
        return { file, item };
      });

      setItems((prev) => [...prev, ...queuedEntries.map((entry) => entry.item)]);
      setSelectedId((prev) => prev || queuedEntries[0]?.item.id || null);

      const hasHeic = queuedEntries.some((e) => isHeicFormat(e.item.sourceFormat, e.file));
      if (hasHeic) {
        showToast('Memproses gambar HEIC/HEIF di browser...', 'info');
      }

      let successCount = 0;
      for (const { file, item } of queuedEntries) {
        const prepared = await prepareReadableSourceUrl(file, item.sourceFormat);
        const preparedItem: ConverterItem = {
          ...item,
          sourceUrl: prepared.sourceUrl,
          width: prepared.width,
          height: prepared.height,
          convertedWidth: prepared.width,
          convertedHeight: prepared.height,
        };

        const result = prepared.width > 0
          ? await convertSingleItem(
              preparedItem,
              preparedItem.targetFormat,
              quality,
              jpgBgColor,
              scalePercent,
              maxWidthPx
            )
          : {
              targetFormat: preparedItem.targetFormat,
              convertedBlob: null,
              convertedUrl: null,
              convertedSize: 0,
              status: 'error' as const,
              errorMessage: isHeicFormat(item.sourceFormat, file)
                ? 'Berkas HEIC/HEIF gagal didekode oleh browser'
                : 'Format gambar tidak dapat dibaca browser',
            };

        if (result.status === 'done') successCount += 1;

        setItems((prev) =>
          prev.map((cur) => {
            if (cur.id !== item.id) return cur;
            if (cur.sourceUrl && cur.sourceUrl !== prepared.sourceUrl) {
              URL.revokeObjectURL(cur.sourceUrl);
            }
            if (cur.convertedUrl && cur.convertedUrl !== result.convertedUrl) {
              URL.revokeObjectURL(cur.convertedUrl);
            }
            return {
              ...cur,
              sourceUrl: prepared.sourceUrl,
              width: prepared.width,
              height: prepared.height,
              ...result,
            };
          })
        );
      }

      if (successCount > 0) {
        showToast(`${successCount} gambar berhasil dimuat & dikonversi`, 'success');
      }
    },
    [convertSingleItem, formatMode, jpgBgColor, maxWidthPx, quality, scalePercent, showToast]
  );

  // Trigger live re-conversion when settings change
  useEffect(() => {
    if (itemsRef.current.length === 0) return;
    const timer = setTimeout(() => {
      void reconvertAll(itemsRef.current, formatMode, quality, jpgBgColor, scalePercent, maxWidthPx);
    }, 120);
    return () => clearTimeout(timer);
  }, [formatMode, quality, jpgBgColor, scalePercent, maxWidthPx, reconvertAll]);

  // Support Ctrl+V paste image directly
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const clipboardItems = e.clipboardData?.items;
      if (!clipboardItems) return;
      const pastedFiles: File[] = [];
      for (let i = 0; i < clipboardItems.length; i++) {
        const entry = clipboardItems[i];
        if (entry.type.startsWith('image/')) {
          const file = entry.getAsFile();
          if (file) {
            const ext = entry.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
            const renamed = new File([file], `clipboard_${Date.now()}.${ext}`, { type: file.type });
            pastedFiles.push(renamed);
          }
        }
      }
      if (pastedFiles.length > 0) {
        void handleFilesAdded(pastedFiles);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleFilesAdded]);

  const handleChangeItemTargetFormat = async (item: ConverterItem, nextFormat: OutputFormat) => {
    setItems((prev) =>
      prev.map((cur) => (cur.id === item.id ? { ...cur, targetFormat: nextFormat, status: 'converting' } : cur))
    );
    const result = await convertSingleItem(item, nextFormat, quality, jpgBgColor, scalePercent, maxWidthPx);
    setItems((prev) =>
      prev.map((cur) => {
        if (cur.id !== item.id) return cur;
        if (cur.convertedUrl && cur.convertedUrl !== result.convertedUrl) {
          URL.revokeObjectURL(cur.convertedUrl);
        }
        return { ...cur, ...result };
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) {
        URL.revokeObjectURL(target.sourceUrl);
        if (target.convertedUrl) URL.revokeObjectURL(target.convertedUrl);
      }
      const next = prev.filter((i) => i.id !== id);
      if (selectedId === id) {
        setSelectedId(next[0]?.id || null);
      }
      return next;
    });
  };

  const handleClearAll = () => {
    items.forEach((item) => {
      URL.revokeObjectURL(item.sourceUrl);
      if (item.convertedUrl) URL.revokeObjectURL(item.convertedUrl);
    });
    setItems([]);
    setSelectedId(null);
  };

  const handleDownloadSingle = (item: ConverterItem) => {
    if (!item.convertedUrl) return;
    const ext = EXT_BY_FORMAT[item.targetFormat];
    const link = document.createElement('a');
    link.href = item.convertedUrl;
    link.download = `${item.baseName}.${ext}`;
    link.click();
    showToast(`Mengunduh ${item.baseName}.${ext}`, 'success');
  };

  const handleDownloadAllZip = async () => {
    const readyItems = items.filter((i) => i.status === 'done' && i.convertedBlob);
    if (readyItems.length === 0) return;

    if (readyItems.length === 1) {
      handleDownloadSingle(readyItems[0]);
      return;
    }

    setIsZipping(true);
    try {
      const zipInputs = await Promise.all(
        readyItems.map(async (item) => ({
          name: `${item.baseName}.${EXT_BY_FORMAT[item.targetFormat]}`,
          data: new Uint8Array(await item.convertedBlob!.arrayBuffer()),
        }))
      );
      const zipBlob = createZipBlob(zipInputs);
      const zipUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = zipUrl;
      a.download = `Converted_Images_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(zipUrl), 1500);
      showToast(`${readyItems.length} gambar diunduh dalam 1 berkas ZIP`, 'success');
    } catch {
      showToast('Gagal mengemas berkas ZIP', 'error');
    } finally {
      setIsZipping(false);
    }
  };

  const selectedItem = items.find((i) => i.id === selectedId) || items[0] || null;
  const completedItems = items.filter((i) => i.status === 'done');
  const totalSourceBytes = completedItems.reduce((sum, i) => sum + i.sourceSize, 0);
  const totalConvertedBytes = completedItems.reduce((sum, i) => sum + i.convertedSize, 0);
  const needsJpgBackdrop =
    formatMode === 'jpg' ||
    formatMode === 'auto_flip' ||
    items.some((i) => i.targetFormat === 'jpg');
  const usesLossyQuality =
    formatMode !== 'png' || items.some((i) => i.targetFormat !== 'png');

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Image Format Converter
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Ubah PNG ke JPG, JPG ke PNG, HEIC (iPhone) ke JPG/PNG, atau WebP secara instan di browser tanpa mengurangi privasi berkas Anda.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif,image/heic,image/heif"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                void handleFilesAdded(e.target.files);
                e.target.value = '';
              }
            }}
          />
          {items.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3.5 py-2 rounded-lg text-xs font-medium border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bersihkan</span>
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Gambar</span>
          </button>
          {completedItems.length > 0 && (
            <button
              onClick={() => void handleDownloadAllZip()}
              disabled={isZipping}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {completedItems.length > 1 ? <Archive className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              <span>
                {isZipping
                  ? 'Mengemas...'
                  : completedItems.length > 1
                    ? `Unduh Semua (${completedItems.length} ZIP)`
                    : 'Unduh Hasil'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Conversion Controls Toolbar */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-500" />
              <span>Mode Target Konversi</span>
            </label>
            <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
              {[
                { id: 'auto_flip' as const, label: 'Tukar PNG ⇄ JPG' },
                { id: 'jpg' as const, label: 'Semua ke JPG' },
                { id: 'png' as const, label: 'Semua ke PNG' },
                { id: 'webp' as const, label: 'Semua ke WebP' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setFormatMode(opt.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    formatMode === opt.id
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {formatMode === 'auto_flip' && 'Otomatis mengubah berkas PNG & HEIC menjadi JPG, serta JPG/WebP menjadi PNG.'}
              {formatMode === 'jpg' && 'Semua gambar dikonversi menjadi JPG (.jpg) dengan ukuran ringkas.'}
              {formatMode === 'png' && 'Semua gambar dikonversi menjadi PNG (.png) lossless berkualitas tinggi.'}
              {formatMode === 'webp' && 'Semua gambar dikonversi menjadi WebP (.webp) modern yang sangat ringan.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:w-[520px]">
            {/* Quality Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Kualitas</span>
                </span>
                <span className="font-mono tabular-nums font-semibold text-neutral-900 dark:text-neutral-100">
                  {usesLossyQuality ? `${quality}%` : 'Lossless'}
                </span>
              </div>
              <input
                type="range"
                min={15}
                max={100}
                step={1}
                disabled={!usesLossyQuality}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full accent-indigo-600 disabled:opacity-40 cursor-pointer"
              />
            </div>

            {/* Scale / Resize */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block">
                Skala Dimensi
              </label>
              <div className="flex items-center gap-1.5">
                <select
                  value={scalePercent}
                  onChange={(e) => setScalePercent(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-indigo-500"
                >
                  <option value={100}>100% (Asli)</option>
                  <option value={75}>75%</option>
                  <option value={50}>50%</option>
                  <option value={25}>25%</option>
                </select>
                <input
                  type="number"
                  min={0}
                  placeholder="Max W"
                  value={maxWidthPx}
                  onChange={(e) => setMaxWidthPx(e.target.value)}
                  title="Lebar maksimal piksel (opsional)"
                  className="w-20 px-2 py-1.5 rounded-lg text-xs font-mono tabular-nums bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            {/* JPG Transparency Background Fill */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block">
                Latar PNG → JPG
              </label>
              <div className="flex items-center gap-1.5">
                {[
                  { hex: '#ffffff', label: 'Putih' },
                  { hex: '#000000', label: 'Hitam' },
                ].map((bg) => (
                  <button
                    key={bg.hex}
                    type="button"
                    disabled={!needsJpgBackdrop}
                    onClick={() => setJpgBgColor(bg.hex)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 ${
                      jpgBgColor.toLowerCase() === bg.hex
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {bg.label}
                  </button>
                ))}
                <input
                  type="color"
                  disabled={!needsJpgBackdrop}
                  value={jpgBgColor}
                  onChange={(e) => setJpgBgColor(e.target.value)}
                  title="Pilih warna latar pengganti area transparan"
                  className="w-8 h-7 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent cursor-pointer disabled:opacity-40"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Empty Dropzone or Workspace Grid */}
      {items.length === 0 ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files.length > 0) {
              void handleFilesAdded(e.dataTransfer.files);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30'
              : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-indigo-400 dark:hover:border-indigo-500'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <Upload className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Tarik & lepas gambar di sini, atau klik untuk memilih berkas
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 max-w-md mx-auto">
            Mendukung banyak gambar sekaligus (batch) dalam format PNG, JPG, JPEG, HEIC/HEIF (foto iPhone), WebP, BMP, GIF, dan SVG. Anda juga dapat langsung menekan Ctrl+V untuk menempel gambar.
          </p>
          <button
            type="button"
            className="mt-5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors inline-flex items-center gap-2"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Pilih Gambar (PNG / JPG / HEIC / WebP)</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: File Queue & Drop Mini-Zone */}
          <div className="lg:col-span-7 space-y-4">
            {/* Compact Drop Bar */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files.length > 0) {
                  void handleFilesAdded(e.dataTransfer.files);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed rounded-xl px-4 py-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30'
                  : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-indigo-400'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Upload className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="text-xs text-neutral-600 dark:text-neutral-300 truncate">
                  Tarik gambar tambahan ke sini atau klik untuk menambah antrean (Ctrl+V juga didukung)
                </span>
              </div>
              <span className="text-xs font-mono tabular-nums text-neutral-500 dark:text-neutral-400 shrink-0">
                {items.length} berkas
              </span>
            </div>

            {/* Summary Strip */}
            {completedItems.length > 0 && (
              <div className="grid grid-cols-3 gap-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5">
                <div>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block">Total Berkas Selesai</span>
                  <span className="text-sm font-semibold font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
                    {completedItems.length} / {items.length}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block">Ukuran Awal → Hasil</span>
                  <span className="text-sm font-semibold font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
                    {formatBytes(totalSourceBytes)} → {formatBytes(totalConvertedBytes)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block">Selisih Ukuran</span>
                  {(() => {
                    const diffPct = totalSourceBytes > 0
                      ? Math.round(((totalConvertedBytes - totalSourceBytes) / totalSourceBytes) * 100)
                      : 0;
                    const isSmaller = diffPct <= 0;
                    return (
                      <span
                        className={`text-sm font-semibold font-mono tabular-nums ${
                          isSmaller ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {diffPct <= 0 ? `Hemat ${Math.abs(diffPct)}%` : `+${diffPct}%`}
                      </span>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* File List */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl divide-y divide-neutral-200 dark:divide-neutral-800 overflow-hidden">
              {items.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                const diffPct =
                  item.status === 'done' && item.sourceSize > 0
                    ? Math.round(((item.convertedSize - item.sourceSize) / item.sourceSize) * 100)
                    : null;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/60 dark:bg-indigo-950/25'
                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {(item.convertedUrl || (item.sourceUrl && item.width > 0)) ? (
                        <img
                          src={item.convertedUrl || item.sourceUrl}
                          alt={item.fileName}
                          className="w-12 h-12 rounded-lg object-cover border border-neutral-200 dark:border-neutral-700 shrink-0 bg-neutral-100 dark:bg-neutral-800"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg border border-neutral-200 dark:border-neutral-700 shrink-0 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                          <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                            {item.baseName}.{EXT_BY_FORMAT[item.targetFormat]}
                          </p>
                          {item.status === 'converting' && (
                            <RefreshCw className="w-3 h-3 animate-spin text-indigo-500 shrink-0" />
                          )}
                          {item.status === 'done' && (
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400 font-mono tabular-nums mt-0.5">
                          <span>{item.sourceFormat}</span>
                          <span aria-hidden="true">→</span>
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                            {LABEL_BY_FORMAT[item.targetFormat]}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{item.convertedWidth || item.width}×{item.convertedHeight || item.height}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {formatBytes(item.sourceSize)}
                            {item.status === 'done' ? ` → ${formatBytes(item.convertedSize)}` : ''}
                          </span>
                          {diffPct !== null && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className={diffPct <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                                {diffPct <= 0 ? `-${Math.abs(diffPct)}%` : `+${diffPct}%`}
                              </span>
                            </>
                          )}
                        </div>
                        {item.status === 'error' && (
                          <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
                            {item.errorMessage || 'Gagal mengonversi berkas ini'}
                          </p>
                        )}
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-2 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <select
                        value={item.targetFormat}
                        onChange={(e) => void handleChangeItemTargetFormat(item, e.target.value as OutputFormat)}
                        aria-label={`Target format untuk ${item.fileName}`}
                        className="px-2 py-1.5 rounded-lg text-xs font-medium bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="jpg">Ke JPG</option>
                        <option value="png">Ke PNG</option>
                        <option value="webp">Ke WebP</option>
                      </select>

                      <button
                        type="button"
                        disabled={item.status !== 'done'}
                        onClick={() => handleDownloadSingle(item)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Unduh</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                        title="Hapus dari daftar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Live Side-by-Side Comparison Preview */}
          <div className="lg:col-span-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2 min-w-0">
                <Eye className="w-4 h-4 text-indigo-500 shrink-0" />
                <h3 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                  Pratinjau: {selectedItem?.fileName}
                </h3>
              </div>
              {selectedItem?.status === 'done' && (
                <button
                  type="button"
                  onClick={() => handleDownloadSingle(selectedItem)}
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Simpan .{EXT_BY_FORMAT[selectedItem.targetFormat]}
                </button>
              )}
            </div>

            {selectedItem && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 mb-1.5 font-mono tabular-nums">
                    <span>Asli ({selectedItem.sourceFormat})</span>
                    <span>{selectedItem.width}×{selectedItem.height} · {formatBytes(selectedItem.sourceSize)}</span>
                  </div>
                  <div
                    className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden flex items-center justify-center max-h-56 min-h-32 bg-[repeating-conic-gradient(#e5e7eb_0%_25%,#f9fafb_0%_50%)] dark:bg-[repeating-conic-gradient(#262626_0%_25%,#171717_0%_50%)] bg-[length:16px_16px]"
                  >
                    {selectedItem.sourceUrl && selectedItem.width > 0 ? (
                      <img
                        src={selectedItem.sourceUrl}
                        alt={`Asli ${selectedItem.fileName}`}
                        className="max-h-56 w-auto object-contain"
                      />
                    ) : selectedItem.status === 'error' ? (
                      <span className="text-xs text-rose-600 dark:text-rose-400 px-4 text-center">
                        {selectedItem.errorMessage || 'Pratinjau tidak tersedia'}
                      </span>
                    ) : (
                      <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 mb-1.5 font-mono tabular-nums">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      Hasil ({LABEL_BY_FORMAT[selectedItem.targetFormat]})
                    </span>
                    <span>
                      {selectedItem.status === 'done'
                        ? `${selectedItem.convertedWidth}×${selectedItem.convertedHeight} · ${formatBytes(selectedItem.convertedSize)}`
                        : selectedItem.status === 'error'
                        ? 'Gagal'
                        : 'Memproses...'}
                    </span>
                  </div>
                  <div
                    className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden flex items-center justify-center max-h-56 min-h-32 bg-[repeating-conic-gradient(#e5e7eb_0%_25%,#f9fafb_0%_50%)] dark:bg-[repeating-conic-gradient(#262626_0%_25%,#171717_0%_50%)] bg-[length:16px_16px]"
                  >
                    {selectedItem.convertedUrl ? (
                      <img
                        src={selectedItem.convertedUrl}
                        alt={`Hasil ${selectedItem.baseName}.${EXT_BY_FORMAT[selectedItem.targetFormat]}`}
                        className="max-h-56 w-auto object-contain"
                      />
                    ) : selectedItem.status === 'error' ? (
                      <span className="text-xs text-rose-600 dark:text-rose-400 px-4 text-center">
                        {selectedItem.errorMessage || 'Gagal mengonversi gambar'}
                      </span>
                    ) : (
                      <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
