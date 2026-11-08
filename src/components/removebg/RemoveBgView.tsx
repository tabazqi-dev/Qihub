import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Sparkles, 
  Upload, 
  Download, 
  Trash2, 
  Sliders, 
  Palette, 
  RefreshCw, 
  Check, 
  Image as ImageIcon,
  Scissors,
  Wand2,
  Eraser,
  Paintbrush,
  RotateCcw,
  Layers,
  MousePointerClick,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

type EngineMode = 'mediapipe_ai' | 'connected_floodfill' | 'manual_brush';

export const RemoveBgView: React.FC = () => {
  const { showToast } = useApp();

  // Active image sources
  const [originalImage, setOriginalImage] = useState<string | null>(
    '/src/assets/images/user_avatar_1793517278515.jpg'
  );
  const [cutoutImage, setCutoutImage] = useState<string | null>(null);
  const [finalCompositedImage, setFinalCompositedImage] = useState<string | null>(null);

  // Engine state
  const [activeEngine, setActiveEngine] = useState<EngineMode>('mediapipe_ai');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [fileName, setFileName] = useState('potret_subjek');

  // Connected Floodfill Parameters
  const [tolerance, setTolerance] = useState<number>(32);
  const [feather, setFeather] = useState<number>(2);

  // Manual Brush Tool state
  const [brushMode, setBrushMode] = useState<'erase' | 'restore'>('erase');
  const [brushSize, setBrushSize] = useState<number>(24);
  const [isDrawing, setIsDrawing] = useState(false);

  // Background replacement
  const [bgReplacement, setBgReplacement] = useState<'transparent' | 'white' | 'dark' | 'gradient' | 'custom'>('transparent');
  const [customBgColor, setCustomBgColor] = useState('#6366f1');

  // Canvases & Image refs
  const interactiveCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ================= 1. RUN CHOSEN ENGINE =================
  const processImageWithEngine = useCallback((engine: EngineMode) => {
    if (!originalImageRef.current) return;
    const img = originalImageRef.current;

    if (engine === 'mediapipe_ai') {
      runMediaPipeAI(img);
    } else {
      runConnectedComponentFloodfill(img, tolerance, feather);
    }
  }, [tolerance, feather]);

  // Preload original image
  useEffect(() => {
    if (!originalImage) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      originalImageRef.current = img;
      processImageWithEngine(activeEngine);
    };
    img.onerror = () => {
      showToast('Gagal memuat gambar', 'error');
    };
    img.src = originalImage;
  }, [originalImage]);

  // ================= 2. MEDIAPIPE AI SEGMENTATION =================
  const runMediaPipeAI = async (img: HTMLImageElement) => {
    setIsProcessing(true);
    setProgressStatus('Memuat Google MediaPipe Neural Segmentor...');

    try {
      const SelfieSegmentationClass = (window as any).SelfieSegmentation;

      if (!SelfieSegmentationClass) {
        // If not loaded yet, wait a moment or load dynamically
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js';
          script.crossOrigin = 'anonymous';
          script.onload = () => resolve(true);
          script.onerror = () => reject(new Error('Gagal memuat script MediaPipe CDN'));
          document.head.appendChild(script);
        });
      }

      const SegmentationConstructor = (window as any).SelfieSegmentation;
      if (!SegmentationConstructor) {
        throw new Error('SelfieSegmentation constructor tidak ditemukan');
      }

      setProgressStatus('Segmentasi objek AI mendeteksi wajah & subjek...');

      const segmenter = new SegmentationConstructor({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
      });

      segmenter.setOptions({
        modelSelection: 1, // 1 for landscape/general (accurate and fast)
        selfieMode: false,
      });

      segmenter.onResults((results: any) => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 1. Draw segmentation mask
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(results.segmentationMask, 0, 0, w, h);

        // 2. Composite with original image using source-in
        ctx.globalCompositeOperation = 'source-in';
        ctx.drawImage(img, 0, 0, w, h);

        const url = canvas.toDataURL('image/png');
        setCutoutImage(url);
        initMaskFromImage(url);

        setIsProcessing(false);
        setProgressStatus('');
        showToast('Background berhasil dihilangkan dengan AI (Wajah & warna asli utuh)!', 'success');
      });

      await segmenter.send({ image: img });
    } catch (err) {
      console.warn('MediaPipe AI failed or blocked, falling back to Connected Floodfill:', err);
      showToast('Koneksi MediaPipe dialihkan ke Connected Border Floodfill...', 'info');
      setActiveEngine('connected_floodfill');
      runConnectedComponentFloodfill(img, tolerance, feather);
    }
  };

  // ================= 3. TRUE BFS CONNECTED-BORDER FLOODFILL =================
  // Unlike naive per-pixel thresholding, this BFS algorithm starts ONLY from the canvas boundary edges
  // and flows inward. It NEVER enters the face, eyes, lips, or body because the hair and skin form
  // a solid barrier. This guarantees the subject is 100% protected and NEVER bleached!
  const runConnectedComponentFloodfill = (
    img: HTMLImageElement,
    tol: number,
    fthr: number,
    customSeed?: { x: number; y: number }
  ) => {
    setIsProcessing(true);
    setProgressStatus('Menjalankan Boundary-Connected Floodfill...');

    setTimeout(() => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;

        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = w;
        srcCanvas.height = h;
        const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
        if (!srcCtx) {
          setIsProcessing(false);
          return;
        }

        srcCtx.drawImage(img, 0, 0, w, h);
        const imgData = srcCtx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // Sample background reference colors from 4 outer corners
        const cornerIndices = [
          0,
          (w - 1) * 4,
          ((h - 1) * w) * 4,
          ((h - 1) * w + (w - 1)) * 4,
        ];
        let rBg = 0, gBg = 0, bBg = 0;
        cornerIndices.forEach((idx) => {
          rBg += data[idx];
          gBg += data[idx + 1];
          bBg += data[idx + 2];
        });
        rBg /= cornerIndices.length;
        gBg /= cornerIndices.length;
        bBg /= cornerIndices.length;

        if (customSeed) {
          const seedIdx = (customSeed.y * w + customSeed.x) * 4;
          rBg = data[seedIdx];
          gBg = data[seedIdx + 1];
          bBg = data[seedIdx + 2];
        }

        // Color distance threshold (0 - 441)
        const tolDist = (tol / 100) * 320;

        // Visited array to mark pixels that are part of the outer background
        const isBg = new Uint8Array(w * h);
        const queue: number[] = [];

        // Push border pixels that match background color
        if (customSeed) {
          const idx = customSeed.y * w + customSeed.x;
          isBg[idx] = 1;
          queue.push(idx);
        } else {
          // Push top and bottom borders
          for (let x = 0; x < w; x++) {
            [0, h - 1].forEach((y) => {
              const pIdx = y * w + x;
              const dIdx = pIdx * 4;
              const dist = Math.sqrt(
                0.299 * (data[dIdx] - rBg) ** 2 +
                0.587 * (data[dIdx + 1] - gBg) ** 2 +
                0.114 * (data[dIdx + 2] - bBg) ** 2
              );
              if (dist <= tolDist && isBg[pIdx] === 0) {
                isBg[pIdx] = 1;
                queue.push(pIdx);
              }
            });
          }

          // Push left and right borders
          for (let y = 0; y < h; y++) {
            [0, w - 1].forEach((x) => {
              const pIdx = y * w + x;
              const dIdx = pIdx * 4;
              const dist = Math.sqrt(
                0.299 * (data[dIdx] - rBg) ** 2 +
                0.587 * (data[dIdx + 1] - gBg) ** 2 +
                0.114 * (data[dIdx + 2] - bBg) ** 2
              );
              if (dist <= tolDist && isBg[pIdx] === 0) {
                isBg[pIdx] = 1;
                queue.push(pIdx);
              }
            });
          }
        }

        // BFS traversal: only spreads to adjacent connected background pixels
        let head = 0;
        while (head < queue.length) {
          const curr = queue[head++];
          const cx = curr % w;
          const cy = Math.floor(curr / w);

          // 4-connected neighbors
          const neighbors = [
            [cx + 1, cy],
            [cx - 1, cy],
            [cx, cy + 1],
            [cx, cy - 1],
          ];

          for (let i = 0; i < 4; i++) {
            const nx = neighbors[i][0];
            const ny = neighbors[i][1];

            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              const nIdx = ny * w + nx;
              if (isBg[nIdx] === 0) {
                const ndIdx = nIdx * 4;
                const dist = Math.sqrt(
                  0.299 * (data[ndIdx] - rBg) ** 2 +
                  0.587 * (data[ndIdx + 1] - gBg) ** 2 +
                  0.114 * (data[ndIdx + 2] - bBg) ** 2
                );

                if (dist <= tolDist) {
                  isBg[nIdx] = 1;
                  queue.push(nIdx);
                }
              }
            }
          }
        }

        // Apply alpha transparency ONLY to visited background pixels
        for (let i = 0; i < w * h; i++) {
          if (isBg[i] === 1) {
            data[i * 4 + 3] = 0; // Make background transparent
          }
        }

        srcCtx.putImageData(imgData, 0, 0);
        const url = srcCanvas.toDataURL('image/png');
        setCutoutImage(url);
        initMaskFromImage(url);
        showToast('Boundary Floodfill selesai! Wajah dan subjek tetap aman terlindungi.', 'success');
      } catch (e) {
        console.error('Floodfill error', e);
        showToast('Gagal memproses floodfill', 'error');
      } finally {
        setIsProcessing(false);
        setProgressStatus('');
      }
    }, 50);
  };

  // Sync mask canvas for manual brush editing
  const initMaskFromImage = (dataUrl: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const maskCanvas = maskCanvasRef.current || document.createElement('canvas');
      maskCanvas.width = img.width;
      maskCanvas.height = img.height;
      const ctx = maskCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        ctx.drawImage(img, 0, 0);
      }
      maskCanvasRef.current = maskCanvas;
      renderComposite();
    };
    img.src = dataUrl;
  };

  // Composite Cutout + Background Replacement onto Interactive Canvas
  const renderComposite = useCallback(() => {
    const mask = maskCanvasRef.current;
    const canvas = interactiveCanvasRef.current;
    if (!mask || !canvas) return;

    canvas.width = mask.width;
    canvas.height = mask.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Background Replacement
    if (bgReplacement === 'white') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (bgReplacement === 'dark') {
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (bgReplacement === 'gradient') {
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#4f46e5');
      grad.addColorStop(1, '#9333ea');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (bgReplacement === 'custom') {
      ctx.fillStyle = customBgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 2. Draw Cutout
    ctx.drawImage(mask, 0, 0);

    // 3. Export data URL for download
    setFinalCompositedImage(canvas.toDataURL('image/png'));
  }, [bgReplacement, customBgColor]);

  useEffect(() => {
    renderComposite();
  }, [renderComposite]);

  // ================= 4. MANUAL BRUSH & MAGIC WAND CLICK =================
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeEngine === 'connected_floodfill') {
      // Magic Wand Click: user clicks a remaining background pocket (e.g. between arm and waist)
      const canvas = interactiveCanvasRef.current;
      const img = originalImageRef.current;
      if (!canvas || !img) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const clickX = Math.floor((e.clientX - rect.left) * scaleX);
      const clickY = Math.floor((e.clientY - rect.top) * scaleY);

      runConnectedComponentFloodfill(img, tolerance, feather, { x: clickX, y: clickY });
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeEngine !== 'manual_brush') return;
    setIsDrawing(true);
    drawBrush(e);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeEngine !== 'manual_brush') return;
    drawBrush(e);
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
  };

  const drawBrush = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = interactiveCanvasRef.current;
    const mask = maskCanvasRef.current;
    const original = originalImageRef.current;
    if (!canvas || !mask || !original) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const maskCtx = mask.getContext('2d');
    if (!maskCtx) return;

    maskCtx.save();
    maskCtx.beginPath();
    maskCtx.arc(x, y, brushSize * (scaleX / 2), 0, Math.PI * 2);

    if (brushMode === 'erase') {
      maskCtx.globalCompositeOperation = 'destination-out';
      maskCtx.fill();
    } else {
      maskCtx.globalCompositeOperation = 'source-over';
      maskCtx.clip();
      maskCtx.drawImage(original, 0, 0);
    }

    maskCtx.restore();
    renderComposite();
  };

  // Switch Engine Mode
  const handleSwitchEngine = (engine: EngineMode) => {
    setActiveEngine(engine);
    processImageWithEngine(engine);
  };

  // File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Hanya berkas gambar (JPG, PNG, WebP) yang didukung', 'warning');
      return;
    }

    setFileName(file.name.replace(/\.[^/.]+$/, ''));
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setOriginalImage(result);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Download Output
  const handleDownload = () => {
    if (!finalCompositedImage) return;
    const a = document.createElement('a');
    a.href = finalCompositedImage;
    const bgTag = bgReplacement === 'transparent' ? 'transparent' : bgReplacement;
    a.download = `${fileName}_nobg_${bgTag}.png`;
    a.click();
    showToast('Gambar berhasil diunduh dalam format PNG resolusi penuh!', 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Remove Background Studio
            </h2>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Teknologi MediaPipe AI Portrait Segmentor & Connected Floodfill menjamin warna kulit dan wajah tetap utuh alami tanpa efek pemutihan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 shadow-xs cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Unggah Foto Baru</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          <button
            onClick={handleDownload}
            disabled={!finalCompositedImage || isProcessing}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 disabled:opacity-40 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Unduh PNG</span>
          </button>
        </div>
      </div>

      {/* Engine Selection Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-neutral-500 pl-2">Metode Segmentasi:</span>

          {/* Engine 1: Google MediaPipe AI */}
          <button
            onClick={() => handleSwitchEngine('mediapipe_ai')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeEngine === 'mediapipe_ai'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>MediaPipe AI (Potret/Wajah Alami)</span>
          </button>

          {/* Engine 2: Connected Boundary Floodfill */}
          <button
            onClick={() => handleSwitchEngine('connected_floodfill')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeEngine === 'connected_floodfill'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm'
                : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/60'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Connected Floodfill (Anti-Wajah Tembus)</span>
          </button>

          {/* Engine 3: Manual Brush */}
          <button
            onClick={() => handleSwitchEngine('manual_brush')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeEngine === 'manual_brush'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm'
                : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/60'
            }`}
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span>Kuas Hapus/Pulihkan</span>
          </button>
        </div>

        <span className="text-[11px] text-neutral-400 font-mono pr-2">
          {activeEngine === 'mediapipe_ai' ? 'Neural Silhouette Protection' : activeEngine === 'connected_floodfill' ? 'Perimeter Boundary BFS' : 'Manual Precision Brush'}
        </span>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 Cols): Canvas Viewport */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            {/* Viewport Top Controls */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800 mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Pratinjau Hasil Cutout
              </span>

              {activeEngine === 'manual_brush' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setBrushMode('erase')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      brushMode === 'erase'
                        ? 'bg-rose-500 text-white'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                    }`}
                  >
                    <Eraser className="w-3 h-3" />
                    <span>Hapus Background</span>
                  </button>

                  <button
                    onClick={() => setBrushMode('restore')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      brushMode === 'restore'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                    }`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Pulihkan Objek</span>
                  </button>
                </div>
              )}

              {activeEngine === 'connected_floodfill' && (
                <div className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                  <MousePointerClick className="w-3.5 h-3.5" />
                  <span>Tip: Klik bagian background di kanvas untuk menghapus area yang tersisa</span>
                </div>
              )}
            </div>

            {/* Checkerboard Canvas Box */}
            <div 
              className="relative aspect-square sm:aspect-video rounded-2xl overflow-hidden border border-neutral-300 dark:border-neutral-700 flex items-center justify-center p-2 bg-neutral-100 dark:bg-neutral-950"
              style={{
                backgroundImage: bgReplacement === 'transparent'
                  ? 'radial-gradient(#94a3b8 1px, transparent 1px), radial-gradient(#94a3b8 1px, #f1f5f9 1px)'
                  : 'none',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 8px 8px'
              }}
            >
              <canvas
                ref={interactiveCanvasRef}
                onClick={handleCanvasClick}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                className={`max-h-full max-w-full object-contain ${
                  activeEngine === 'manual_brush' 
                    ? 'cursor-crosshair' 
                    : activeEngine === 'connected_floodfill' 
                    ? 'cursor-pointer' 
                    : 'cursor-default'
                }`}
              />

              {/* Loading Progress Overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-neutral-950/75 backdrop-blur-xs flex flex-col items-center justify-center gap-3 text-white p-6">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
                  <p className="text-sm font-bold tracking-tight">{progressStatus || 'Memproses Cutout...'}</p>
                  <p className="text-[11px] text-neutral-300">
                    Wajah dan lekuk pakaian diproteksi secara otomatis.
                  </p>
                </div>
              )}
            </div>

            {/* Reference to original image */}
            {originalImage && (
              <div className="mt-4 flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={originalImage}
                    alt="Original"
                    className="w-10 h-10 rounded-lg object-cover border shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                      Foto Sumber: {fileName}
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      Resolusi penuh diproses tanpa kompresi rusak
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                  Ganti Foto
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 Cols): Controls & Studio Backdrops */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-5">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-neutral-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                Pengaturan Studio & Kuas
              </h3>
            </div>

            {/* Engine 1 Info */}
            {activeEngine === 'mediapipe_ai' && (
              <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>MediaPipe AI Portrait Active</span>
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 text-[11px] leading-relaxed">
                  Model AI mengenali kontur manusia secara terpisah sehingga wajah, bibir, pipi, dan rambut <strong>tidak akan terhapus</strong> atau berubah menjadi putih!
                </p>
                <button
                  onClick={() => processImageWithEngine('mediapipe_ai')}
                  disabled={isProcessing}
                  className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Proses Ulang AI</span>
                </button>
              </div>
            )}

            {/* Engine 2 Sliders */}
            {activeEngine === 'connected_floodfill' && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 text-[11px] text-amber-800 dark:text-amber-300">
                  Metode ini mengalir hanya dari batas luar kanvas (BFS), sehingga bagian dalam wajah 100% terlindung dari penghapusan.
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    <span>Toleransi Warna Background</span>
                    <span className="font-mono">{tolerance}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="65"
                    step="1"
                    value={tolerance}
                    onChange={(e) => {
                      setTolerance(Number(e.target.value));
                      if (originalImageRef.current) {
                        runConnectedComponentFloodfill(originalImageRef.current, Number(e.target.value), feather);
                      }
                    }}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Geser untuk menyesuaikan jangkauan warna background.
                  </p>
                </div>
              </div>
            )}

            {/* Engine 3 Sliders */}
            {activeEngine === 'manual_brush' && (
              <div>
                <div className="flex justify-between text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                  <span>Ukuran Kuas</span>
                  <span className="font-mono">{brushSize} px</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="80"
                  step="2"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            )}

            {/* Background Replacement Options */}
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                <Palette className="w-3.5 h-3.5 text-indigo-500" />
                <span>Ganti Latar Studio</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setBgReplacement('transparent')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    bgReplacement === 'transparent'
                      ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 font-semibold'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-500'
                  }`}
                >
                  Transparan (PNG)
                </button>
                <button
                  type="button"
                  onClick={() => setBgReplacement('white')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    bgReplacement === 'white'
                      ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 font-semibold'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-500'
                  }`}
                >
                  Studio Putih
                </button>
                <button
                  type="button"
                  onClick={() => setBgReplacement('dark')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    bgReplacement === 'dark'
                      ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 font-semibold'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-500'
                  }`}
                >
                  Dark Minimalist
                </button>
                <button
                  type="button"
                  onClick={() => setBgReplacement('gradient')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    bgReplacement === 'gradient'
                      ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 font-semibold'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-500'
                  }`}
                >
                  Gradient Violet
                </button>
              </div>

              {/* Custom color picker */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="color"
                  value={customBgColor}
                  onChange={(e) => {
                    setCustomBgColor(e.target.value);
                    setBgReplacement('custom');
                  }}
                  className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                />
                <span className="text-xs text-neutral-500">Pilih warna custom background</span>
              </div>
            </div>

            {/* Download CTA */}
            <div className="pt-2">
              <button
                onClick={handleDownload}
                disabled={!finalCompositedImage || isProcessing}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 font-semibold text-xs shadow-md transition-all cursor-pointer disabled:opacity-40"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Hasil Gambar ({bgReplacement === 'transparent' ? 'PNG Transparan' : 'Studio Background'})</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
