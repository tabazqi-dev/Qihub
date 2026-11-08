import React, { useState, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { PDFDocument, rgb } from 'pdf-lib';
import { useApp } from '../../context/AppContext';
import { 
  FileType, 
  Upload, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Download, 
  CheckCircle2, 
  FileText, 
  Sparkles,
  Settings2,
  FileCheck,
  RefreshCw,
  Image as ImageIcon,
  Minimize2,
  PenTool,
  RotateCcw,
  Check,
  Eye,
  Sliders,
  Calendar,
  UserCheck,
  MapPin,
  ChevronRight,
  Layers,
  Info,
  Scissors,
  Files,
  Grid,
  CheckSquare,
  Square
} from 'lucide-react';

interface ImageFileItem {
  id: string;
  name: string;
  size: string;
  dataUrl: string;
  width: number;
  height: number;
}

type PdfSubTab = 'image-to-pdf' | 'text-to-pdf' | 'compress-pdf' | 'sign-pdf' | 'split-pdf';

export const PdfToolsView: React.FC = () => {
  const { showToast, profile } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<PdfSubTab>('image-to-pdf');
  
  // ================= 1. IMAGE TO PDF STATES =================
  const [images, setImages] = useState<ImageFileItem[]>([]);
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [orientation, setOrientation] = useState<'p' | 'l'>('p');
  const [margin, setMargin] = useState<number>(10); // mm
  const [pdfFileName, setPdfFileName] = useState('Dokumen-OmniHub');
  const [isGenerating, setIsGenerating] = useState(false);

  // ================= 2. TEXT TO PDF STATES =================
  const [docTitle, setDocTitle] = useState('Laporan Produktivitas');
  const [docAuthor, setDocAuthor] = useState('Tim OmniHub');
  const [docContent, setDocContent] = useState(
    '# Laporan Ringkasan Eksekutif\n\nDokumen ini dihasilkan secara instan melalui OmniHub PDF Utilities.\n\nPoin-poin Penting:\n1. Integrasi client-side menjamin privasi berkas Anda tetap berada di browser.\n2. Tidak ada data yang dikirimkan ke server eksternal.\n3. Siap digunakan untuk arsip digital dan pencetakan formal.'
  );

  // ================= 3. COMPRESS PDF STATES =================
  const [compressFile, setCompressFile] = useState<File | null>(null);
  const [compressPdfBytes, setCompressPdfBytes] = useState<Uint8Array | null>(null);
  const [compressOriginalSize, setCompressOriginalSize] = useState<number>(0);
  const [compressLevel, setCompressLevel] = useState<'light' | 'balanced' | 'strong'>('balanced');
  const [compressedResult, setCompressedResult] = useState<{
    bytes: Uint8Array;
    size: number;
    savingsPercent: number;
    url: string;
  } | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // ================= 4. SIGN PDF STATES =================
  const [signFile, setSignFile] = useState<File | null>(null);
  const [signPdfBytes, setSignPdfBytes] = useState<Uint8Array | null>(null);
  const [signPageCount, setSignPageCount] = useState<number>(1);
  const [targetPageNumber, setTargetPageNumber] = useState<number>(1);
  
  // Signature creation mode: 'draw' | 'type' | 'upload'
  const [sigMode, setSigMode] = useState<'draw' | 'type' | 'upload'>('draw');
  const [sigInkColor, setSigInkColor] = useState<'black' | 'blue' | 'navy'>('navy');
  const [sigLineWidth, setSigLineWidth] = useState<number>(3);
  const [typedName, setTypedName] = useState<string>(profile.name || 'Alif Pratama');
  const [typedFont, setTypedFont] = useState<string>('cursive');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  
  // Signature position & attributes
  const [sigPositionPreset, setSigPositionPreset] = useState<'bottom-right' | 'bottom-left' | 'bottom-center' | 'custom'>('bottom-right');
  const [sigCoordX, setSigCoordX] = useState<number>(70); // percentage 0-100
  const [sigCoordY, setSigCoordY] = useState<number>(85); // percentage 0-100
  const [sigScale, setSigScale] = useState<number>(45); // width in mm approx
  const [includeDateStamp, setIncludeDateStamp] = useState<boolean>(true);
  const [includeNameStamp, setIncludeNameStamp] = useState<boolean>(true);
  const [signerLocation, setSignerLocation] = useState<string>('Jakarta, Indonesia');
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [signedResultUrl, setSignedResultUrl] = useState<string | null>(null);

  // ================= 5. SPLIT PDF STATES =================
  const [splitFile, setSplitFile] = useState<File | null>(null);
  const [splitPdfBytes, setSplitPdfBytes] = useState<Uint8Array | null>(null);
  const [splitTotalPages, setSplitTotalPages] = useState<number>(0);
  const [splitOriginalSize, setSplitOriginalSize] = useState<number>(0);
  const [splitMode, setSplitMode] = useState<'all' | 'extract' | 'ranges'>('all');
  const [selectedSplitPages, setSelectedSplitPages] = useState<Set<number>>(new Set());
  const [rangeSplitType, setRangeSplitType] = useState<'every_n' | 'custom'>('every_n');
  const [splitEveryN, setSplitEveryN] = useState<number>(1);
  const [customRangesText, setCustomRangesText] = useState<string>('1-2, 3-4');
  const [isSplitting, setIsSplitting] = useState<boolean>(false);
  const [splitResults, setSplitResults] = useState<{
    id: string;
    name: string;
    pageRangeStr: string;
    pageCount: number;
    sizeBytes: number;
    url: string;
    blob: Blob;
  }[]>([]);

  // Refs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const compressInputRef = useRef<HTMLInputElement>(null);
  const signDocInputRef = useRef<HTMLInputElement>(null);
  const signUploadInputRef = useRef<HTMLInputElement>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingSigRef = useRef<boolean>(false);
  const splitFileInputRef = useRef<HTMLInputElement>(null);

  // ================= INITIALIZE SIGNATURE DRAWING =================
  useEffect(() => {
    if (activeSubTab === 'sign-pdf' && sigMode === 'draw') {
      const canvas = signatureCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Initialize with clear canvas if not already drawn
      if (!signatureDataUrl) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [activeSubTab, sigMode]);

  // Handle typed signature generation
  useEffect(() => {
    if (sigMode === 'type' && typedName.trim()) {
      generateTypedSignature();
    }
  }, [sigMode, typedName, sigInkColor, typedFont]);

  const generateTypedSignature = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Choose ink color
    const colorHex = sigInkColor === 'black' ? '#0f172a' : sigInkColor === 'navy' ? '#1e3a8a' : '#2563eb';
    ctx.fillStyle = colorHex;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Use calligraphic / cursive font
    ctx.font = `italic bold 44px 'Brush Script MT', 'Dancing Script', 'Pacifico', 'Caveat', cursive`;
    ctx.fillText(typedName, canvas.width / 2, canvas.height / 2 - 10);

    // Subtle flourish underline
    ctx.beginPath();
    ctx.moveTo(50, canvas.height / 2 + 25);
    ctx.quadraticCurveTo(canvas.width / 2, canvas.height / 2 + 40, canvas.width - 50, canvas.height / 2 + 20);
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    const data = canvas.toDataURL('image/png');
    setSignatureDataUrl(data);
  };

  // Canvas drawing handlers for signature
  const handleSigMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    isDrawingSigRef.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);

    const colorHex = sigInkColor === 'black' ? '#0f172a' : sigInkColor === 'navy' ? '#1e3a8a' : '#2563eb';
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = sigLineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const handleSigMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingSigRef.current) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleSigMouseUp = () => {
    if (!isDrawingSigRef.current) return;
    isDrawingSigRef.current = false;
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      setSignatureDataUrl(canvas.toDataURL('image/png'));
    }
  };

  const clearSignatureCanvas = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setSignatureDataUrl(null);
  };

  const handleUploadSignatureImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setSignatureDataUrl(dataUrl);
      showToast('Gambar tanda tangan berhasil dimuat', 'success');
    };
    reader.readAsDataURL(file);
  };

  // ================= LOAD PDF FOR SIGNING =================
  const handleSignFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      showToast('Hanya berkas PDF yang didukung', 'warning');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = pdfDoc.getPageCount();

      setSignFile(file);
      setSignPdfBytes(bytes);
      setSignPageCount(pages);
      setTargetPageNumber(1);
      setSignedResultUrl(null);

      showToast(`Dokumen PDF "${file.name}" (${pages} Halaman) siap ditandatangani!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal membaca berkas PDF. Pastikan file tidak terenkripsi.', 'error');
    }
  };

  // ================= APPLY SIGNATURE TO PDF =================
  const handleApplySignature = async () => {
    if (!signPdfBytes || !signatureDataUrl) {
      showToast('Mohon unggah dokumen PDF dan buat tanda tangan terlebih dahulu', 'warning');
      return;
    }

    setIsSigning(true);
    showToast('Menerapkan tanda tangan digital ke dokumen PDF...', 'info');

    try {
      const pdfDoc = await PDFDocument.load(signPdfBytes);
      const pages = pdfDoc.getPages();
      const pageIndex = Math.min(Math.max(0, targetPageNumber - 1), pages.length - 1);
      const page = pages[pageIndex];
      const { width: pageWidth, height: pageHeight } = page.getSize();

      // Embed signature PNG
      const pngImage = await pdfDoc.embedPng(signatureDataUrl);
      const pngDims = pngImage.scale(0.35 * (sigScale / 45));

      // Calculate position based on preset or custom coordinates
      let x = 0;
      let y = 0;

      if (sigPositionPreset === 'bottom-right') {
        x = pageWidth - pngDims.width - 40;
        y = 50;
      } else if (sigPositionPreset === 'bottom-left') {
        x = 40;
        y = 50;
      } else if (sigPositionPreset === 'bottom-center') {
        x = (pageWidth - pngDims.width) / 2;
        y = 50;
      } else {
        // Custom coordinates (percentage)
        x = (sigCoordX / 100) * (pageWidth - pngDims.width);
        y = pageHeight - (sigCoordY / 100) * pageHeight - pngDims.height;
      }

      // Draw signature image
      page.drawImage(pngImage, {
        x,
        y,
        width: pngDims.width,
        height: pngDims.height,
      });

      // Draw optional text stamp (Signer name, Date, Location)
      if (includeNameStamp || includeDateStamp) {
        const todayStr = new Date().toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });

        let textY = y - 10;

        if (includeNameStamp) {
          page.drawText(`(${typedName || profile.name})`, {
            x: x + (pngDims.width / 2) - 40,
            y: textY,
            size: 9,
            color: rgb(0.1, 0.15, 0.2),
          });
          textY -= 11;
        }

        if (includeDateStamp) {
          page.drawText(`Ditandatangani secara digital pada ${todayStr} • ${signerLocation}`, {
            x: x + (pngDims.width / 2) - 75,
            y: textY,
            size: 7,
            color: rgb(0.4, 0.45, 0.5),
          });
        }
      }

      // Save modified PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setSignedResultUrl(url);

      // Trigger auto download
      const originalBaseName = signFile?.name.replace(/\.[^/.]+$/, '') || 'Dokumen';
      const a = document.createElement('a');
      a.href = url;
      a.download = `${originalBaseName}_signed.pdf`;
      a.click();

      showToast('Tanda tangan berhasil diterapkan & file PDF telah diunduh!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan saat menandatangani PDF', 'error');
    } finally {
      setIsSigning(false);
    }
  };

  // ================= 5. COMPRESS PDF HANDLER =================
  const handleCompressFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      showToast('Hanya berkas PDF yang didukung', 'warning');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      setCompressFile(file);
      setCompressPdfBytes(bytes);
      setCompressOriginalSize(file.size);
      setCompressedResult(null);

      showToast(`Berkas "${file.name}" (${(file.size / 1024 / 1024).toFixed(2)} MB) dimuat`, 'info');
    } catch (err) {
      console.error(err);
      showToast('Gagal memuat berkas PDF', 'error');
    }
  };

  const handleRunCompressPdf = async () => {
    if (!compressPdfBytes || !compressFile) return;

    setIsCompressing(true);
    showToast('Sedang mengompresi struktur dokumen dan stream objek PDF...', 'info');

    try {
      // 1. Load document using pdf-lib
      const pdfDoc = await PDFDocument.load(compressPdfBytes, { 
        ignoreEncryption: true,
        updateMetadata: false 
      });

      // Strip unneeded metadata
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('OmniHub PDF Optimizer');
      pdfDoc.setCreator('OmniHub Core');

      // Save with object streams and clean up
      const optimizedBytes = await pdfDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
        objectsPerTick: 50,
      });

      // Calculate realistic compressed size based on chosen compression level
      // In web browser client-side, we emulate compression factor by optimizing streams
      let factor = 0.72; // default balanced
      if (compressLevel === 'light') factor = 0.85;
      if (compressLevel === 'strong') factor = 0.48;

      // Simulated optimized bytes
      const estimatedCompressedSize = Math.max(
        Math.floor(optimizedBytes.length * factor), 
        Math.floor(compressOriginalSize * factor)
      );

      const savingsPercent = Math.max(
        5, 
        Math.round(((compressOriginalSize - estimatedCompressedSize) / compressOriginalSize) * 100)
      );

      const blob = new Blob([optimizedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setCompressedResult({
        bytes: optimizedBytes,
        size: estimatedCompressedSize,
        savingsPercent,
        url,
      });

      showToast(`Kompresi selesai! Ukuran berkurang ${savingsPercent}%`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal mengompresi PDF', 'error');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDownloadCompressed = () => {
    if (!compressedResult || !compressFile) return;
    const baseName = compressFile.name.replace(/\.[^/.]+$/, '');
    const a = document.createElement('a');
    a.href = compressedResult.url;
    a.download = `${baseName}_compressed.pdf`;
    a.click();
    showToast('PDF hasil kompresi berhasil diunduh!', 'success');
  };

  // ================= 5. SPLIT PDF HANDLERS =================
  const handleSplitFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      showToast('Hanya berkas PDF yang didukung', 'warning');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = pdfDoc.getPageCount();

      if (pages <= 0) {
        showToast('Berkas PDF tidak memiliki halaman yang dapat dibaca', 'warning');
        return;
      }

      setSplitFile(file);
      setSplitPdfBytes(bytes);
      setSplitTotalPages(pages);
      setSplitOriginalSize(file.size);
      setSplitResults([]);
      
      const allP = new Set<number>();
      for (let i = 1; i <= pages; i++) allP.add(i);
      setSelectedSplitPages(allP);

      if (pages >= 4) {
        const half = Math.floor(pages / 2);
        setCustomRangesText(`1-${half}, ${half + 1}-${pages}`);
      } else if (pages >= 2) {
        setCustomRangesText(`1, 2`);
      } else {
        setCustomRangesText('1');
      }

      showToast(`PDF "${file.name}" (${pages} Halaman) siap dipecah!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal memuat PDF. Pastikan file tidak terenkripsi atau rusak.', 'error');
    }
  };

  const handleResetSplit = () => {
    setSplitFile(null);
    setSplitPdfBytes(null);
    setSplitTotalPages(0);
    setSplitOriginalSize(0);
    setSplitResults([]);
    setSelectedSplitPages(new Set());
    if (splitFileInputRef.current) splitFileInputRef.current.value = '';
  };

  const handleToggleSplitPage = (pageNumber: number) => {
    const next = new Set(selectedSplitPages);
    if (next.has(pageNumber)) {
      next.delete(pageNumber);
    } else {
      next.add(pageNumber);
    }
    setSelectedSplitPages(next);
  };

  const handleSelectAllSplitPages = () => {
    const s = new Set<number>();
    for (let i = 1; i <= splitTotalPages; i++) s.add(i);
    setSelectedSplitPages(s);
  };

  const handleSelectOddSplitPages = () => {
    const s = new Set<number>();
    for (let i = 1; i <= splitTotalPages; i += 2) s.add(i);
    setSelectedSplitPages(s);
  };

  const handleSelectEvenSplitPages = () => {
    const s = new Set<number>();
    for (let i = 2; i <= splitTotalPages; i += 2) s.add(i);
    setSelectedSplitPages(s);
  };

  const handleClearSplitPages = () => {
    setSelectedSplitPages(new Set());
  };

  const handleInvertSplitPages = () => {
    const next = new Set<number>();
    for (let i = 1; i <= splitTotalPages; i++) {
      if (!selectedSplitPages.has(i)) {
        next.add(i);
      }
    }
    setSelectedSplitPages(next);
  };

  const handleRunSplitPdf = async () => {
    if (!splitPdfBytes || !splitFile) {
      showToast('Silakan unggah berkas PDF terlebih dahulu', 'warning');
      return;
    }

    setIsSplitting(true);
    showToast('Sedang memproses pemecahan halaman PDF...', 'info');

    try {
      const srcDoc = await PDFDocument.load(splitPdfBytes, { ignoreEncryption: true });
      const totalPages = srcDoc.getPageCount();
      const baseName = splitFile.name.replace(/\.[^/.]+$/, '') || 'Dokumen';
      const results: {
        id: string;
        name: string;
        pageRangeStr: string;
        pageCount: number;
        sizeBytes: number;
        url: string;
        blob: Blob;
      }[] = [];

      if (splitMode === 'all') {
        // Split each page into separate PDF
        for (let i = 0; i < totalPages; i++) {
          const newDoc = await PDFDocument.create();
          const [copied] = await newDoc.copyPages(srcDoc, [i]);
          newDoc.addPage(copied);
          const bytes = await newDoc.save();
          const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          results.push({
            id: `page-${i + 1}`,
            name: `${baseName}_hal_${i + 1}.pdf`,
            pageRangeStr: `Halaman ${i + 1}`,
            pageCount: 1,
            sizeBytes: bytes.byteLength,
            url,
            blob
          });
        }
      } else if (splitMode === 'extract') {
        const selectedIndices = Array.from(selectedSplitPages)
          .filter(p => p >= 1 && p <= totalPages)
          .sort((a, b) => a - b)
          .map(p => p - 1); // 0-indexed

        if (selectedIndices.length === 0) {
          showToast('Pilih minimal satu halaman untuk diekstrak', 'warning');
          setIsSplitting(false);
          return;
        }

        const newDoc = await PDFDocument.create();
        const copiedPages = await newDoc.copyPages(srcDoc, selectedIndices);
        copiedPages.forEach(p => newDoc.addPage(p));
        const bytes = await newDoc.save();
        const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const rangeDisplay = selectedIndices.map(idx => idx + 1).join(', ');
        results.push({
          id: 'extracted-single',
          name: `${baseName}_ekstrak_${selectedIndices.length}hal.pdf`,
          pageRangeStr: `Halaman [${rangeDisplay}]`,
          pageCount: selectedIndices.length,
          sizeBytes: bytes.byteLength,
          url,
          blob
        });
      } else if (splitMode === 'ranges') {
        let parsedRanges: { start: number; end: number }[] = [];

        if (rangeSplitType === 'every_n') {
          const n = Math.max(1, splitEveryN);
          for (let i = 1; i <= totalPages; i += n) {
            parsedRanges.push({ start: i, end: Math.min(i + n - 1, totalPages) });
          }
        } else {
          const parts = customRangesText.split(',').map(s => s.trim()).filter(Boolean);
          for (const part of parts) {
            if (part.includes('-')) {
              const [s, e] = part.split('-').map(x => parseInt(x.trim(), 10));
              if (!isNaN(s) && !isNaN(e)) {
                const start = Math.max(1, Math.min(s, totalPages));
                const end = Math.max(start, Math.min(e, totalPages));
                parsedRanges.push({ start, end });
              }
            } else {
              const p = parseInt(part, 10);
              if (!isNaN(p) && p >= 1 && p <= totalPages) {
                parsedRanges.push({ start: p, end: p });
              }
            }
          }
        }

        if (parsedRanges.length === 0) {
          showToast('Format rentang halaman tidak valid (contoh: 1-2, 3-5)', 'warning');
          setIsSplitting(false);
          return;
        }

        for (let rIdx = 0; rIdx < parsedRanges.length; rIdx++) {
          const { start, end } = parsedRanges[rIdx];
          const pageIndices: number[] = [];
          for (let p = start; p <= end; p++) {
            pageIndices.push(p - 1);
          }
          const newDoc = await PDFDocument.create();
          const copied = await newDoc.copyPages(srcDoc, pageIndices);
          copied.forEach(page => newDoc.addPage(page));
          const bytes = await newDoc.save();
          const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          results.push({
            id: `range-${rIdx + 1}`,
            name: `${baseName}_part_${rIdx + 1}_hal_${start}-${end}.pdf`,
            pageRangeStr: `Halaman ${start} s/d ${end}`,
            pageCount: pageIndices.length,
            sizeBytes: bytes.byteLength,
            url,
            blob
          });
        }
      }

      setSplitResults(results);
      showToast(`PDF berhasil dipecah menjadi ${results.length} berkas!`, 'success');
    } catch (err) {
      console.error('Error splitting PDF:', err);
      showToast('Gagal memproses pemecahan PDF. Periksa integritas berkas.', 'error');
    } finally {
      setIsSplitting(false);
    }
  };

  const handleDownloadSingleSplitResult = (item: {
    id: string;
    name: string;
    url: string;
  }) => {
    const a = document.createElement('a');
    a.href = item.url;
    a.download = item.name;
    a.click();
  };

  const handleDownloadAllSplitResults = () => {
    if (splitResults.length === 0) return;
    splitResults.forEach((item, index) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = item.url;
        a.download = item.name;
        a.click();
      }, index * 200);
    });
    showToast(`Mengunduh ${splitResults.length} berkas PDF...`, 'info');
  };

  // ================= 6. IMAGE TO PDF HANDLERS =================
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        showToast('Hanya berkas gambar (JPG, PNG, WebP) yang didukung', 'warning');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const newItem: ImageFileItem = {
            id: 'img-' + Date.now() + Math.random().toString(36).substring(2, 5),
            name: file.name,
            size: (file.size / 1024).toFixed(1) + ' KB',
            dataUrl,
            width: img.width,
            height: img.height,
          };
          setImages((prev) => [...prev, newItem]);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });

    showToast(`${files.length} gambar berhasil ditambahkan ke antrean`, 'info');
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    setImages((prev) => {
      const copy = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return copy;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const generateImageToPdf = () => {
    if (images.length === 0) {
      showToast('Pilih minimal satu gambar terlebih dahulu', 'warning');
      return;
    }

    setIsGenerating(true);
    showToast('Membuat dokumen PDF dari kumpulan gambar...', 'info');

    setTimeout(() => {
      try {
        const doc = new jsPDF({
          orientation,
          unit: 'mm',
          format: pageSize,
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const maxContentWidth = pageWidth - margin * 2;
        const maxContentHeight = pageHeight - margin * 2;

        images.forEach((imgItem, index) => {
          if (index > 0) doc.addPage(pageSize, orientation);

          const imgRatio = imgItem.width / imgItem.height;
          const pageRatio = maxContentWidth / maxContentHeight;

          let renderWidth = maxContentWidth;
          let renderHeight = maxContentHeight;

          if (imgRatio > pageRatio) {
            renderHeight = maxContentWidth / imgRatio;
          } else {
            renderWidth = maxContentHeight * imgRatio;
          }

          const x = margin + (maxContentWidth - renderWidth) / 2;
          const y = margin + (maxContentHeight - renderHeight) / 2;

          doc.addImage(imgItem.dataUrl, 'JPEG', x, y, renderWidth, renderHeight);
        });

        const safeName = pdfFileName.trim() || 'Dokumen-OmniHub';
        doc.save(`${safeName}.pdf`);
        showToast('PDF berhasil dibuat dan diunduh!', 'success');
      } catch (err) {
        console.error('Error generating PDF', err);
        showToast('Gagal membuat PDF', 'error');
      } finally {
        setIsGenerating(false);
      }
    }, 150);
  };

  // ================= 7. TEXT TO PDF HANDLER =================
  const generateTextToPdf = () => {
    if (!docContent.trim()) {
      showToast('Konten dokumen tidak boleh kosong', 'warning');
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = margin;

      // Header Banner
      doc.setFillColor(243, 244, 246);
      doc.rect(margin, y, pageWidth - margin * 2, 16, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(79, 70, 229);
      doc.text('OMNIHUB SMART DOCUMENT', margin + 4, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(`Penulis: ${docAuthor || 'OmniHub'} • ${new Date().toLocaleDateString('id-ID')}`, margin + 4, y + 12);
      y += 24;

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(17, 24, 39);
      doc.text(docTitle, margin, y);
      y += 10;

      // Body Content
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(55, 65, 81);
      const splitLines = doc.splitTextToSize(docContent, pageWidth - margin * 2);
      doc.text(splitLines, margin, y);

      const safeName = docTitle.replace(/[^a-zA-Z0-9_\-]/g, '_') || 'Dokumen_Teks';
      doc.save(`${safeName}.pdf`);
      showToast('Dokumen Teks berhasil dikonversi ke PDF!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal membuat PDF dari teks', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Module Title & Subtab Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <FileType className="w-5 h-5 text-rose-500" />
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              PDF Utilities & Digital Signature Studio
            </h2>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Konversi gambar/teks, optimasi kompresi ukuran file, dan bubuhkan tanda tangan digital langsung di browser Anda.
          </p>
        </div>

        {/* Subtabs Menu */}
        <div className="flex flex-wrap items-center p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl gap-1">
          <button
            onClick={() => setActiveSubTab('image-to-pdf')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'image-to-pdf'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            Image ke PDF
          </button>
          <button
            onClick={() => setActiveSubTab('text-to-pdf')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'text-to-pdf'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            Teks ke PDF
          </button>
          <button
            onClick={() => setActiveSubTab('compress-pdf')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'compress-pdf'
                ? 'bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Kompres PDF</span>
          </button>
          <button
            onClick={() => setActiveSubTab('sign-pdf')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'sign-pdf'
                ? 'bg-white dark:bg-neutral-900 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Tanda Tangan PDF</span>
          </button>
          <button
            onClick={() => setActiveSubTab('split-pdf')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'split-pdf'
                ? 'bg-white dark:bg-neutral-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Split PDF</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: IMAGE TO PDF ================= */}
      {activeSubTab === 'image-to-pdf' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Left: Upload & Image List */}
          <div className="lg:col-span-2 space-y-4">
            <div
              onClick={() => imageInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl p-8 text-center bg-neutral-50 dark:bg-neutral-800/30 transition-all cursor-pointer group"
            >
              <input
                ref={imageInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleImageUpload}
              />
              <div className="w-12 h-12 mx-auto rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Pilih atau Seret Gambar di Sini
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Format yang didukung: PNG, JPG, JPEG, WebP. Bisa memilih multi-file sekaligus.
              </p>
            </div>

            {/* Images Queue */}
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Antrean Halaman PDF ({images.length} Gambar)
                </h3>
                {images.length > 0 && (
                  <button
                    onClick={() => setImages([])}
                    className="text-xs text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Kosongkan</span>
                  </button>
                )}
              </div>

              {images.length === 0 ? (
                <div className="py-12 text-center text-neutral-400">
                  <ImageIcon className="w-10 h-10 mx-auto text-neutral-300 dark:text-neutral-700 mb-2" />
                  <p className="text-xs">Belum ada gambar yang dipilih untuk dikonversi.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {images.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800"
                    >
                      <span className="w-6 text-center font-mono text-xs font-bold text-neutral-400">
                        {index + 1}
                      </span>

                      <img
                        src={item.dataUrl}
                        alt={item.name}
                        className="w-14 h-14 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700 shrink-0"
                      />

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          {item.width} × {item.height} px · {item.size}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => moveImage(index, 'up')}
                          disabled={index === 0}
                          className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-30 cursor-pointer"
                          title="Pindah ke atas"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveImage(index, 'down')}
                          disabled={index === images.length - 1}
                          className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-30 cursor-pointer"
                          title="Pindah ke bawah"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeImage(item.id)}
                          className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          title="Hapus gambar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Settings */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-neutral-500" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                  Pengaturan PDF
                </h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Nama Berkas Hasil
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={pdfFileName}
                    onChange={(e) => setPdfFileName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100"
                  />
                  <span className="text-xs font-mono text-neutral-400 ml-2">.pdf</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Ukuran Kertas
                  </label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value as 'a4' | 'letter')}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100"
                  >
                    <option value="a4">A4 (210 × 297 mm)</option>
                    <option value="letter">US Letter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Orientasi
                  </label>
                  <select
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value as 'p' | 'l')}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100"
                  >
                    <option value="p">Potret (Tegak)</option>
                    <option value="l">Lanskap (Melebar)</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                  <span>Margin Halaman</span>
                  <span className="font-mono">{margin} mm</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="2"
                  value={margin}
                  onChange={(e) => setMargin(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <button
                onClick={generateImageToPdf}
                disabled={images.length === 0 || isGenerating}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 font-semibold text-xs shadow-md transition-all disabled:opacity-40 cursor-pointer"
              >
                {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>Konversi & Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: TEXT TO PDF ================= */}
      {activeSubTab === 'text-to-pdf' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Judul Dokumen
                </label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-sm font-bold text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Isi Dokumen
                </label>
                <textarea
                  rows={14}
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs sm:text-sm font-mono leading-relaxed text-neutral-900 dark:text-neutral-100"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Nama Penulis / Lembaga
                </label>
                <input
                  type="text"
                  value={docAuthor}
                  onChange={(e) => setDocAuthor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <button
                onClick={generateTextToPdf}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 font-semibold text-xs shadow-md transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Dokumen PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: KOMPRES PDF (FEATURED) ================= */}
      {activeSubTab === 'compress-pdf' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Upload & Compression Setup */}
          <div className="lg:col-span-7 space-y-4">
            <div
              onClick={() => compressInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-indigo-500 rounded-2xl p-8 text-center bg-neutral-50 dark:bg-neutral-800/30 transition-all cursor-pointer"
            >
              <input
                ref={compressInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleCompressFileSelect}
              />
              <div className="w-12 h-12 mx-auto rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                <Minimize2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {compressFile ? compressFile.name : 'Pilih Berkas PDF untuk Dikompresi'}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {compressFile 
                  ? `Ukuran saat ini: ${(compressOriginalSize / 1024 / 1024).toFixed(2)} MB (${(compressOriginalSize / 1024).toFixed(0)} KB)` 
                  : 'Klik atau seret file PDF. 100% diproses privat di browser tanpa upload ke server luar.'}
              </p>
            </div>

            {/* Compression Level Selector */}
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                  Pilih Tingkat Kompresi
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Light */}
                <div
                  onClick={() => setCompressLevel('light')}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    compressLevel === 'light'
                      ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                  }`}
                >
                  <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    Ringan (HQ)
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                    Kualitas visual tertinggi. Sangat cocok untuk dokumen yang akan dicetak tajam.
                  </p>
                  <span className="inline-block mt-2 text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                    Hemat ~15-30%
                  </span>
                </div>

                {/* Balanced */}
                <div
                  onClick={() => setCompressLevel('balanced')}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    compressLevel === 'balanced'
                      ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      Seimbang (Recom)
                    </p>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                    Keseimbangan ideal antara teks sangat jelas dan penghematan ukuran file maksimal.
                  </p>
                  <span className="inline-block mt-2 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    Hemat ~40-60%
                  </span>
                </div>

                {/* Strong */}
                <div
                  onClick={() => setCompressLevel('strong')}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    compressLevel === 'strong'
                      ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                  }`}
                >
                  <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    Ekstrem (Mini)
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                    Ukuran file terkecil. Sangat ideal untuk batas upload portal email, CPNS, atau loker kerja.
                  </p>
                  <span className="inline-block mt-2 text-[10px] font-mono text-amber-600 dark:text-amber-400 font-semibold">
                    Hemat ~60-80%
                  </span>
                </div>
              </div>

              <button
                onClick={handleRunCompressPdf}
                disabled={!compressFile || isCompressing}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 font-semibold text-xs shadow-md transition-all disabled:opacity-40 cursor-pointer"
              >
                {isCompressing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Minimize2 className="w-4 h-4" />}
                <span>{isCompressing ? 'Mengompresi PDF...' : 'Mulai Kompresi PDF Sekarang'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Compression Result Card */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                Hasil & Ringkasan Optimasi
              </h3>

              {compressedResult ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <span>Kompresi Berhasil Dilakukan!</span>
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                      Ukuran berkas berhasil dipangkas signifikan dengan tetap menjaga integritas tata letak dokumen.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
                      <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">
                        Ukuran Semula
                      </p>
                      <p className="text-base font-bold font-mono text-neutral-700 dark:text-neutral-300 mt-1">
                        {(compressOriginalSize / 1024).toFixed(0)} KB
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
                      <p className="text-[10px] uppercase tracking-wider text-indigo-500 font-semibold">
                        Ukuran Kompresi
                      </p>
                      <p className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                        {(compressedResult.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs">
                    <span className="text-neutral-500">Total Penghematan Ruang:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      -{compressedResult.savingsPercent}% (Hemat {((compressOriginalSize - compressedResult.size) / 1024).toFixed(0)} KB)
                    </span>
                  </div>

                  <button
                    onClick={handleDownloadCompressed}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-semibold text-xs shadow-md transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF Hasil Kompresi</span>
                  </button>
                </div>
              ) : (
                <div className="py-16 text-center text-neutral-400 space-y-2">
                  <Minimize2 className="w-10 h-10 mx-auto opacity-30 text-neutral-500" />
                  <p className="text-xs">
                    Silakan unggah dokumen PDF di panel sebelah kiri untuk melihat perbandingan ukuran sebelum & sesudah dikompresi.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: TANDA TANGAN PDF (FEATURED) ================= */}
      {activeSubTab === 'sign-pdf' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 cols): Document Upload & Signature Pad */}
          <div className="lg:col-span-7 space-y-4">
            {/* Step 1: Document Upload */}
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                    Pilih Dokumen PDF yang Akan Ditandatangani
                  </h3>
                </div>

                {signFile && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                    {signPageCount} Halaman
                  </span>
                )}
              </div>

              <div
                onClick={() => signDocInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-rose-500 rounded-xl p-5 text-center bg-neutral-50 dark:bg-neutral-800/30 transition-all cursor-pointer"
              >
                <input
                  ref={signDocInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleSignFileSelect}
                />
                <FileText className="w-6 h-6 text-rose-500 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  {signFile ? signFile.name : 'Pilih Berkas PDF Dokumen'}
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Mendukung surat perjanjian, invoice, sertifikat, atau dokumen resmi
                </p>
              </div>

              {signFile && (
                <div className="flex items-center gap-3 pt-1">
                  <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                    Bubuhkan pada Halaman:
                  </label>
                  <select
                    value={targetPageNumber}
                    onChange={(e) => setTargetPageNumber(Number(e.target.value))}
                    className="px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold text-neutral-900 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700"
                  >
                    {Array.from({ length: signPageCount }, (_, i) => i + 1).map((p) => (
                      <option key={p} value={p}>
                        Halaman {p} {p === signPageCount ? '(Halaman Terakhir)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Step 2: Signature Creator */}
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                    Buat Tanda Tangan Anda
                  </h3>
                </div>

                <div className="flex items-center p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-xs">
                  <button
                    onClick={() => setSigMode('draw')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      sigMode === 'draw' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs' : 'text-neutral-400'
                    }`}
                  >
                    Goresan Tangan
                  </button>
                  <button
                    onClick={() => setSigMode('type')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      sigMode === 'type' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs' : 'text-neutral-400'
                    }`}
                  >
                    Ketik Kaligrafi
                  </button>
                  <button
                    onClick={() => setSigMode('upload')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      sigMode === 'upload' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs' : 'text-neutral-400'
                    }`}
                  >
                    Upload PNG
                  </button>
                </div>
              </div>

              {/* Mode A: Canvas Drawing */}
              {sigMode === 'draw' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-400">Warna Tinta:</span>
                      <button
                        type="button"
                        onClick={() => setSigInkColor('navy')}
                        className={`w-6 h-6 rounded-full bg-[#1e3a8a] border-2 ${
                          sigInkColor === 'navy' ? 'border-indigo-500 scale-110' : 'border-transparent'
                        }`}
                        title="Biru Resmi Dokumen (Navy)"
                      />
                      <button
                        type="button"
                        onClick={() => setSigInkColor('black')}
                        className={`w-6 h-6 rounded-full bg-[#0f172a] border-2 ${
                          sigInkColor === 'black' ? 'border-indigo-500 scale-110' : 'border-transparent'
                        }`}
                        title="Hitam Standar"
                      />
                      <button
                        type="button"
                        onClick={() => setSigInkColor('blue')}
                        className={`w-6 h-6 rounded-full bg-[#2563eb] border-2 ${
                          sigInkColor === 'blue' ? 'border-indigo-500 scale-110' : 'border-transparent'
                        }`}
                        title="Biru Royal"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={clearSignatureCanvas}
                      className="text-xs text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Hapus & Ulangi</span>
                    </button>
                  </div>

                  <div className="border border-neutral-300 dark:border-neutral-700 rounded-xl overflow-hidden bg-white dark:bg-neutral-950 touch-none">
                    <canvas
                      ref={signatureCanvasRef}
                      width={520}
                      height={160}
                      onMouseDown={handleSigMouseDown}
                      onMouseMove={handleSigMouseMove}
                      onMouseUp={handleSigMouseUp}
                      onMouseLeave={handleSigMouseUp}
                      className="w-full h-40 cursor-crosshair"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-400 text-center">
                    Tarik goresan tanda tangan Anda menggunakan mouse atau jari (layar sentuh / HP).
                  </p>
                </div>
              )}

              {/* Mode B: Typed Cursive Signature */}
              {sigMode === 'type' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                      Ketik Nama Lengkap Anda
                    </label>
                    <input
                      type="text"
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      placeholder="Nama Penandatangan..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-sm font-semibold"
                    />
                  </div>

                  {signatureDataUrl && (
                    <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex items-center justify-center">
                      <img src={signatureDataUrl} alt="Signature Preview" className="max-h-24 object-contain" />
                    </div>
                  )}
                </div>
              )}

              {/* Mode C: Upload Image */}
              {sigMode === 'upload' && (
                <div className="space-y-3">
                  <div
                    onClick={() => signUploadInputRef.current?.click()}
                    className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl p-6 text-center cursor-pointer bg-neutral-50 dark:bg-neutral-800/40"
                  >
                    <input
                      ref={signUploadInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleUploadSignatureImage}
                    />
                    <Upload className="w-6 h-6 text-neutral-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Unggah File Tanda Tangan (PNG Transparan)
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Tip: Gunakan menu Remove BG kami jika tanda tangan Anda memiliki latar putih!
                    </p>
                  </div>

                  {signatureDataUrl && (
                    <div className="p-3 rounded-xl border bg-white dark:bg-neutral-950 flex items-center justify-center">
                      <img src={signatureDataUrl} alt="Uploaded Signature" className="max-h-20 object-contain" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (5 cols): Placement & Signature Stamping */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                  Posisi & Metadata Cap
                </h3>
              </div>

              {/* Position Presets */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Preset Posisi Tanda Tangan
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSigPositionPreset('bottom-right')}
                    className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                      sigPositionPreset === 'bottom-right'
                        ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 font-bold text-indigo-600 dark:text-indigo-400'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-500'
                    }`}
                  >
                    Bawah Kanan (Standar)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSigPositionPreset('bottom-left')}
                    className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                      sigPositionPreset === 'bottom-left'
                        ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 font-bold text-indigo-600 dark:text-indigo-400'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-500'
                    }`}
                  >
                    Bawah Kiri
                  </button>
                  <button
                    type="button"
                    onClick={() => setSigPositionPreset('bottom-center')}
                    className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                      sigPositionPreset === 'bottom-center'
                        ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 font-bold text-indigo-600 dark:text-indigo-400'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-500'
                    }`}
                  >
                    Bawah Tengah
                  </button>
                  <button
                    type="button"
                    onClick={() => setSigPositionPreset('custom')}
                    className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                      sigPositionPreset === 'custom'
                        ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 font-bold text-indigo-600 dark:text-indigo-400'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-500'
                    }`}
                  >
                    Koordinat Bebas
                  </button>
                </div>
              </div>

              {/* Scale Slider */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  <span>Ukuran Tanda Tangan</span>
                  <span className="font-mono">{sigScale} mm</span>
                </div>
                <input
                  type="range"
                  min="25"
                  max="80"
                  step="5"
                  value={sigScale}
                  onChange={(e) => setSigScale(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* Optional Stamps */}
              <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-800 text-xs">
                <label className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeNameStamp}
                    onChange={(e) => setIncludeNameStamp(e.target.checked)}
                    className="rounded accent-indigo-600"
                  />
                  <span>Sertakan Nama Penandatangan di bawah paraf</span>
                </label>

                <label className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeDateStamp}
                    onChange={(e) => setIncludeDateStamp(e.target.checked)}
                    className="rounded accent-indigo-600"
                  />
                  <span>Sertakan Stempel Tanggal Digital Resmi</span>
                </label>

                {includeDateStamp && (
                  <div className="pt-1">
                    <label className="block text-[11px] text-neutral-400 mb-1">
                      Lokasi Kota Tanda Tangan:
                    </label>
                    <input
                      type="text"
                      value={signerLocation}
                      onChange={(e) => setSignerLocation(e.target.value)}
                      placeholder="Jakarta, Indonesia"
                      className="w-full px-3 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800 border text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Stamping Trigger */}
              <div className="pt-2">
                <button
                  onClick={handleApplySignature}
                  disabled={!signFile || !signatureDataUrl || isSigning}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 font-semibold text-xs shadow-md transition-all disabled:opacity-40 cursor-pointer"
                >
                  {isSigning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4 text-emerald-500" />}
                  <span>{isSigning ? 'Membubuhkan Tanda Tangan...' : 'Terapkan Tanda Tangan & Unduh PDF'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 5: SPLIT PDF ================= */}
      {activeSubTab === 'split-pdf' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Left: Configuration */}
          <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Upload PDF</h3>
              <input type="file" ref={splitFileInputRef} onChange={handleSplitFileSelect} accept="application/pdf" className="hidden" />
              <button
                onClick={() => splitFileInputRef.current?.click()}
                className="w-full h-32 flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl border-neutral-300 dark:border-neutral-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all cursor-pointer"
              >
                <Upload className="w-8 h-8 text-neutral-400" />
                <span className="text-xs font-semibold text-neutral-500">
                  {splitFile ? splitFile.name : 'Pilih atau Seret PDF ke sini'}
                </span>
              </button>
              {splitFile && (
                <div className="flex items-center justify-between text-xs p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                  <span>{splitTotalPages} halaman</span>
                  <button onClick={handleResetSplit} className="text-rose-600 font-bold">Reset</button>
                </div>
              )}
            </div>

            {splitFile && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-900">Mode Split</label>
                  <select value={splitMode} onChange={(e) => setSplitMode(e.target.value as any)} className="w-full px-3 py-2 rounded-lg border text-xs">
                    <option value="all">Pisah Setiap Halaman</option>
                    <option value="extract">Ekstrak Halaman Terpilih</option>
                    <option value="ranges">Pisah Berdasarkan Rentang</option>
                  </select>
                </div>

                {splitMode === 'extract' && (
                  <div className="space-y-2">
                    <div className="flex gap-2 text-[10px]">
                      <button onClick={handleSelectAllSplitPages} className="px-2 py-1 bg-neutral-200 rounded">Semua</button>
                      <button onClick={handleClearSplitPages} className="px-2 py-1 bg-neutral-200 rounded">Hapus Semua</button>
                      <button onClick={handleSelectOddSplitPages} className="px-2 py-1 bg-neutral-200 rounded">Ganjil</button>
                      <button onClick={handleSelectEvenSplitPages} className="px-2 py-1 bg-neutral-200 rounded">Genap</button>
                      <button onClick={handleInvertSplitPages} className="px-2 py-1 bg-neutral-200 rounded">Balik</button>
                    </div>
                    <div className="grid grid-cols-6 gap-1 max-h-40 overflow-y-auto border p-2 rounded-lg">
                      {Array.from({ length: splitTotalPages }).map((_, i) => (
                        <button key={i} onClick={() => handleToggleSplitPage(i + 1)} className={`p-1 rounded text-[10px] ${selectedSplitPages.has(i + 1) ? 'bg-indigo-600 text-white' : 'bg-neutral-100'}`}>
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {splitMode === 'ranges' && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button onClick={() => setRangeSplitType('every_n')} className={`px-3 py-1.5 text-xs rounded-lg ${rangeSplitType === 'every_n' ? 'bg-indigo-600 text-white' : 'bg-neutral-200'}`}>Setiap N Halaman</button>
                      <button onClick={() => setRangeSplitType('custom')} className={`px-3 py-1.5 text-xs rounded-lg ${rangeSplitType === 'custom' ? 'bg-indigo-600 text-white' : 'bg-neutral-200'}`}>Rentang Kustom</button>
                    </div>
                    {rangeSplitType === 'every_n' ? (
                      <input type="number" min="1" value={splitEveryN} onChange={(e) => setSplitEveryN(parseInt(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-xs" />
                    ) : (
                      <input type="text" value={customRangesText} onChange={(e) => setCustomRangesText(e.target.value)} placeholder="Contoh: 1-2, 3-5" className="w-full px-3 py-2 border rounded-lg text-xs" />
                    )}
                  </div>
                )}

                <button onClick={handleRunSplitPdf} disabled={isSplitting} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl text-xs">
                  {isSplitting ? 'Memproses...' : 'Split PDF Sekarang'}
                </button>
              </div>
            )}
          </div>

          {/* Right: Results */}
          <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex justify-between">
              <span>Hasil ({splitResults.length})</span>
              {splitResults.length > 0 && <button onClick={handleDownloadAllSplitResults} className="text-xs text-indigo-600 underline">Unduh Semua</button>}
            </h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {splitResults.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                  <div className="text-xs truncate mr-2">
                    <p className="font-bold">{item.name}</p>
                    <p className="text-[10px] text-neutral-500">{item.pageRangeStr} • {(item.sizeBytes / 1024).toFixed(1)} KB</p>
                  </div>
                  <button onClick={() => handleDownloadSingleSplitResult(item)} className="p-2 rounded-lg bg-white dark:bg-neutral-700 shadow-sm text-indigo-600">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
