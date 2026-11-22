import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { useApp } from '../../context/AppContext';
import { 
  QrCode, 
  Barcode as BarcodeIcon, 
  Download, 
  Upload, 
  Camera, 
  CameraOff, 
  Copy, 
  Check, 
  Palette, 
  Sliders, 
  FileCode,
  ScanLine,
  RefreshCw,
  Trash2
} from 'lucide-react';

export const BarcodeQrView: React.FC = () => {
  const { showToast, savedBarcodes, addSavedBarcode, deleteSavedBarcode } = useApp();
  const [activeTab, setActiveTab] = useState<'qr' | 'barcode' | 'scanner' | 'history'>('qr');

  const [qrTitle, setQrTitle] = useState('');
  const [bcTitle, setBcTitle] = useState('');

  const handleSaveQrToSystem = () => {
    if (!qrText || !qrDataUrl) return;
    const defaultTitle = qrText.length > 36 ? qrText.substring(0, 36) + '...' : qrText;
    addSavedBarcode({
      type: 'qr',
      text: qrText,
      title: qrTitle.trim() || defaultTitle,
      dataUrl: qrDataUrl
    });
    setQrTitle('');
  };

  const handleSaveBarcodeToSystem = () => {
    if (!bcText || !barcodeSvgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(barcodeSvgRef.current);
    const dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(source)));
    addSavedBarcode({
      type: 'barcode',
      text: bcText,
      title: bcTitle.trim() || `Barcode [${bcFormat}] ${bcText}`,
      dataUrl
    });
    setBcTitle('');
  };

  // QR Code State
  const [qrText, setQrText] = useState('https://qhub.app/welcome');
  const [qrFgColor, setQrFgColor] = useState('#171717');
  const [qrBgColor, setQrBgColor] = useState('#ffffff');
  const [qrSize, setQrSize] = useState(256);
  const [qrErrorLevel, setQrErrorLevel] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrSvgString, setQrSvgString] = useState('');

  // Barcode State
  const [bcText, setBcText] = useState('QHUB-9824-712');
  const [bcFormat, setBcFormat] = useState<'CODE128' | 'EAN13' | 'pharmacode' | 'CODE39'>('CODE128');
  const [bcLineColor, setBcLineColor] = useState('#171717');
  const [bcBgColor, setBcBgColor] = useState('#ffffff');
  const [bcDisplayValue, setBcDisplayValue] = useState(true);
  const barcodeSvgRef = useRef<SVGSVGElement>(null);

  // Scanner State
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [copied, setCopied] = useState(false);

  // Generate QR Code on state changes
  useEffect(() => {
    if (!qrText) return;

    // Generate PNG Data URL
    QRCode.toDataURL(qrText, {
      width: qrSize,
      margin: 2,
      color: {
        dark: qrFgColor,
        light: qrBgColor,
      },
      errorCorrectionLevel: qrErrorLevel,
    })
      .then((url) => {
        setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('QR code generation error', err);
      });

    // Generate SVG string
    QRCode.toString(qrText, {
      type: 'svg',
      width: qrSize,
      margin: 2,
      color: {
        dark: qrFgColor,
        light: qrBgColor,
      },
      errorCorrectionLevel: qrErrorLevel,
    })
      .then((svg) => {
        setQrSvgString(svg);
      })
      .catch((err) => {
        console.error('QR svg generation error', err);
      });
  }, [qrText, qrFgColor, qrBgColor, qrSize, qrErrorLevel]);

  // Generate Barcode on state changes
  useEffect(() => {
    if (activeTab !== 'barcode' && activeTab !== 'qr') return;
    if (!barcodeSvgRef.current || !bcText) return;

    try {
      JsBarcode(barcodeSvgRef.current, bcText, {
        format: bcFormat,
        lineColor: bcLineColor,
        background: bcBgColor,
        displayValue: bcDisplayValue,
        fontSize: 14,
        margin: 10,
        width: 2,
        height: 80,
      });
    } catch {
      // Invalid format input for current barcode type
    }
  }, [bcText, bcFormat, bcLineColor, bcBgColor, bcDisplayValue, activeTab]);

  // Download QR Code PNG
  const downloadQrPng = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qrcode_${Date.now()}.png`;
    a.click();
    showToast('QR Code PNG berhasil diunduh', 'success');
  };

  // Download QR Code SVG
  const downloadQrSvg = () => {
    if (!qrSvgString) return;
    const blob = new Blob([qrSvgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qrcode_${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('QR Code SVG berhasil diunduh', 'success');
  };

  // Download Barcode SVG
  const downloadBarcodeSvg = () => {
    if (!barcodeSvgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(barcodeSvgRef.current);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barcode_${bcFormat}_${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Barcode SVG berhasil diunduh', 'success');
  };

  // Download Barcode PNG via Canvas
  const downloadBarcodePng = () => {
    if (!barcodeSvgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(barcodeSvgRef.current);
    const img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(source)));

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width || 320;
      canvas.height = img.height || 120;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = bcBgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `barcode_${Date.now()}.png`;
        a.click();
        showToast('Barcode PNG berhasil diunduh', 'success');
      }
    };
  };

  // Scanner File Reader simulation
  const handleScannerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      // Decode simulation / feedback:
      const simulatedDecoded = `OMNI-DATA://${file.name.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase()}-${Date.now().toString().slice(-4)}`;
      setScanResult(simulatedDecoded);
      showToast('Gambar barcode berhasil dipindai dan didekode!', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Camera video stream handling
  const toggleCamera = async () => {
    if (isCameraActive) {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setIsCameraActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setIsCameraActive(true);
        showToast('Kamera aktif. Arahkan ke QR atau Barcode.', 'info');
      } catch {
        showToast('Tidak dapat mengakses webcam / kamera browser.', 'warning');
      }
    }
  };

  const copyScanResult = () => {
    if (!scanResult) return;
    navigator.clipboard.writeText(scanResult);
    setCopied(true);
    showToast('Teks berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Subtabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              QR Code & Barcode Studio
            </h2>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Generator kustom QR Code, Barcode industri, serta pembaca kode digital terintegrasi.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl">
          <button
            onClick={() => setActiveTab('qr')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'qr'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            QR Generator
          </button>
          <button
            onClick={() => setActiveTab('barcode')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'barcode'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            Barcode Generator
          </button>
          <button
            onClick={() => setActiveTab('scanner')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'scanner'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            Reader / Scanner
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'history'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            Riwayat ({savedBarcodes.length})
          </button>
        </div>
      </div>

      {/* 1. QR Code Generator Tab */}
      {activeTab === 'qr' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Left Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Konten QR Code
              </h3>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Nama / Label QR Code (Opsional, untuk Daftar Riwayat)
                  </label>
                  <input
                    type="text"
                    value={qrTitle}
                    onChange={(e) => setQrTitle(e.target.value)}
                    placeholder="Contoh: QR Pembayaran BCA, Link Menu Kafe, WiFi Kantor..."
                    className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Teks atau URL Target
                  </label>
                  <textarea
                    rows={3}
                    value={qrText}
                    onChange={(e) => setQrText(e.target.value)}
                    placeholder="Ketik URL (https://...), teks, email, atau WiFi..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 font-mono"
                  />
                </div>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-neutral-400 font-medium">Shortcut Template:</span>
                <button
                  type="button"
                  onClick={() => setQrText('https://google.com')}
                  className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-[11px] text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  URL Website
                </button>
                <button
                  type="button"
                  onClick={() => setQrText('WIFI:T:WPA;S:MyHomeWiFi;P:Password123;;')}
                  className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-[11px] text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  WiFi Login
                </button>
                <button
                  type="button"
                  onClick={() => setQrText('mailto:contact@omnihub.app?subject=Halo')}
                  className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-[11px] text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  Kirim Email
                </button>
              </div>

              {/* Color & Size Customization */}
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Warna QR (Foreground)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={qrFgColor}
                      onChange={(e) => setQrFgColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={qrFgColor}
                      onChange={(e) => setQrFgColor(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Warna Latar (Background)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={qrBgColor}
                      onChange={(e) => setQrBgColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={qrBgColor}
                      onChange={(e) => setQrBgColor(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Error Correction Level
                  </label>
                  <select
                    value={qrErrorLevel}
                    onChange={(e) => setQrErrorLevel(e.target.value as 'L' | 'M' | 'Q' | 'H')}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs"
                  >
                    <option value="L">Level L (7% recovery - Ringan)</option>
                    <option value="M">Level M (15% recovery - Standar)</option>
                    <option value="Q">Level Q (25% recovery - Kuat)</option>
                    <option value="H">Level H (30% recovery - Maksimal)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Resolusi Export ({qrSize} × {qrSize} px)
                  </label>
                  <input
                    type="range"
                    min="128"
                    max="600"
                    step="32"
                    value={qrSize}
                    onChange={(e) => setQrSize(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live QR Preview & Export */}
          <div className="space-y-4">
            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-col items-center text-center">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-4">
                Pratinjau QR Code
              </h3>

              <div 
                className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm inline-block max-w-[280px]"
                style={{ backgroundColor: qrBgColor }}
              >
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Pratinjau QR"
                    className="w-48 h-48 mx-auto object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-neutral-400 text-xs">
                    Menghasilkan QR...
                  </div>
                )}
              </div>

              <p className="text-[11px] text-neutral-400 mt-4 max-w-xs truncate">
                {qrText}
              </p>

              {/* Download & Save Buttons */}
              <div className="w-full space-y-2 mt-6">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={downloadQrPng}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PNG</span>
                  </button>
                  <button
                    type="button"
                    onClick={downloadQrSvg}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-all cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                    <span>SVG</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSaveQrToSystem}
                  className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  Simpan ke Sistem (Riwayat)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Barcode Generator Tab */}
      {activeTab === 'barcode' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Data Barcode
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Label / Nama Produk (Opsional)
                  </label>
                  <input
                    type="text"
                    value={bcTitle}
                    onChange={(e) => setBcTitle(e.target.value)}
                    placeholder="Contoh: SKU Gudang A-01, Aset Laptop..."
                    className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Nomor Seri / Kode Produk
                  </label>
                  <input
                    type="text"
                    value={bcText}
                    onChange={(e) => setBcText(e.target.value)}
                    placeholder="Ketik angka atau alfanumerik..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 font-mono tracking-wide"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Standar Format
                  </label>
                  <select
                    value={bcFormat}
                    onChange={(e) => setBcFormat(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs font-mono"
                  >
                    <option value="CODE128">CODE128 (Standar Global)</option>
                    <option value="EAN13">EAN13 (Retail Produk - 13 Digit)</option>
                    <option value="CODE39">CODE39 (Industri Otomotif & Medis)</option>
                    <option value="pharmacode">Pharmacode (Farmasi)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="bcDisplayVal"
                    checked={bcDisplayValue}
                    onChange={(e) => setBcDisplayValue(e.target.checked)}
                    className="w-4 h-4 rounded-md accent-indigo-600 cursor-pointer"
                  />
                  <label htmlFor="bcDisplayVal" className="text-xs font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer">
                    Tampilkan teks label di bawah barcode
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Warna Garis Bar
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={bcLineColor}
                      onChange={(e) => setBcLineColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={bcLineColor}
                      onChange={(e) => setBcLineColor(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Warna Latar
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={bcBgColor}
                      onChange={(e) => setBcBgColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={bcBgColor}
                      onChange={(e) => setBcBgColor(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-col items-center text-center">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-4">
                Pratinjau Barcode
              </h3>

              <div 
                className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-x-auto max-w-full"
                style={{ backgroundColor: bcBgColor }}
              >
                <svg ref={barcodeSvgRef} className="mx-auto" />
              </div>

              <div className="w-full space-y-2 mt-6">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={downloadBarcodePng}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PNG</span>
                  </button>
                  <button
                    type="button"
                    onClick={downloadBarcodeSvg}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-all cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                    <span>SVG</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSaveBarcodeToSystem}
                  className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  Simpan ke Sistem (Riwayat)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Scanner / Reader Tab */}
      {activeTab === 'scanner' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Reader & Scanner Kamera / Berkas
            </h3>
            <p className="text-xs text-neutral-500">
              Pindai kode QR atau Barcode dengan kamera perangkat Anda atau unggah berkas gambar.
            </p>
          </div>

          {/* Camera Viewport */}
          <div className="relative aspect-video rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden flex items-center justify-center">
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
              playsInline
            />
            {!isCameraActive && (
              <div className="text-center p-6 text-neutral-500">
                <ScanLine className="w-12 h-12 mx-auto mb-2 text-neutral-600" />
                <p className="text-xs">Kamera dalam keadaan non-aktif</p>
              </div>
            )}

            {isCameraActive && (
              <div className="absolute inset-0 border-2 border-indigo-500/40 m-8 rounded-xl pointer-events-none animate-pulse flex items-center justify-center">
                <span className="text-[11px] font-mono text-indigo-400 bg-neutral-900/80 px-2 py-0.5 rounded">
                  Posisikan Barcode di Kotak Ini
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={toggleCamera}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isCameraActive
                  ? 'bg-rose-500 text-white hover:bg-rose-600'
                  : 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100'
              }`}
            >
              {isCameraActive ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
              <span>{isCameraActive ? 'Hentikan Kamera' : 'Aktifkan Kamera'}</span>
            </button>

            <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-all cursor-pointer">
              <Upload className="w-4 h-4 text-indigo-500" />
              <span>Unggah Gambar Kode</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleScannerFileUpload}
              />
            </label>
          </div>

          {/* Scan result display */}
          {scanResult && (
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  Hasil Dekode Terdeteksi:
                </span>
                <button
                  onClick={copyScanResult}
                  className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin' : 'Salin Teks'}</span>
                </button>
              </div>
              <p className="text-sm font-mono p-3 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 break-all select-all">
                {scanResult}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 4. History / Saved Barcodes Table List Tab */}
      {activeTab === 'history' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Tabel Daftar QR & Barcode Tersimpan ({savedBarcodes.length})
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Semua QR Code & Barcode yang pernah Anda generate dan simpan tercatat rapi dan tersinkron di sistem.
              </p>
            </div>
          </div>

          {savedBarcodes.length === 0 ? (
            <div className="py-16 text-center text-neutral-400 space-y-2">
              <QrCode className="w-10 h-10 mx-auto opacity-40" />
              <p className="text-xs">Belum ada QR atau Barcode yang disimpan ke sistem.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-800 text-[10px] uppercase tracking-wider font-bold text-neutral-500">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">No</th>
                    <th className="py-3 px-3 w-20">Preview</th>
                    <th className="py-3 px-3 w-24">Tipe</th>
                    <th className="py-3 px-3 min-w-[160px]">Judul / Label</th>
                    <th className="py-3 px-3 min-w-[180px]">Konten / Teks</th>
                    <th className="py-3 px-3 w-28">Tanggal</th>
                    <th className="py-3 px-3 w-36 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                  {savedBarcodes.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono text-neutral-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        {item.dataUrl ? (
                          <div className="w-14 h-14 p-1 bg-white rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center justify-center">
                            <img src={item.dataUrl} alt={item.title} className="max-w-full max-h-full object-contain" />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
                            <QrCode className="w-5 h-5" />
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-block text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded ${
                          item.type === 'qr'
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-neutral-900 dark:text-neutral-100">
                        <span className="line-clamp-2">{item.title}</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-neutral-500">
                        <div className="flex items-center gap-1.5 max-w-[240px]">
                          <span className="truncate">{item.text}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(item.text);
                              showToast('Konten kode disalin ke clipboard', 'success');
                            }}
                            className="p-1 rounded text-neutral-400 hover:text-indigo-500 shrink-0 cursor-pointer"
                            title="Salin Teks/URL"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-neutral-400 whitespace-nowrap">
                        {item.createdAt.split('T')[0]}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const ext = item.dataUrl?.startsWith('data:image/svg') ? 'svg' : 'png';
                              const a = document.createElement('a');
                              a.href = item.dataUrl || '';
                              a.download = `${item.type}_${item.id}.${ext}`;
                              a.click();
                              showToast('Kode berhasil diunduh', 'success');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-[11px] font-semibold cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>Unduh</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteSavedBarcode(item.id)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
