import React, { useState, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { useApp } from '../../context/AppContext';
import { NoteItem } from '../../types';
import { 
  FileText, 
  Plus, 
  Pin, 
  Trash2, 
  Search, 
  Download, 
  Tag, 
  Folder, 
  Eye, 
  Edit3, 
  Bold, 
  Italic, 
  List, 
  Code, 
  Quote, 
  Heading1, 
  Heading2,
  Copy,
  Check,
  FileDown,
  Image as ImageIcon,
  Link as LinkIcon,
  Upload,
  X,
  AlertCircle,
  Sparkles,
  Calendar,
  CheckSquare,
  Square,
  CheckCircle2
} from 'lucide-react';

export const NotesKnowledgeView: React.FC = () => {
  const { 
    notes, 
    noteCategories,
    addNote, 
    updateNote, 
    deleteNote, 
    togglePinNote, 
    addNoteCategory,
    deleteNoteCategory,
    profile,
    showToast 
  } = useApp();

  const [selectedNoteId, setSelectedNoteId] = useState<string>(() => notes[0]?.id || '');
  const [searchFilter, setSearchFilter] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [editorMode, setEditorMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [copied, setCopied] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Modal States
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isInsertImageOpen, setIsInsertImageOpen] = useState(false);
  const [imageInsertTab, setImageInsertTab] = useState<'upload' | 'url'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [noteToDelete, setNoteToDelete] = useState<NoteItem | null>(null);

  // New tag input state
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagText, setNewTagText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Active note lookup
  const activeNote = notes.find((n) => n.id === selectedNoteId) || notes[0];

  // Update selectedNoteId if activeNote becomes invalid
  useEffect(() => {
    if (notes.length > 0 && !notes.some(n => n.id === selectedNoteId)) {
      setSelectedNoteId(notes[0].id);
    }
  }, [notes, selectedNoteId]);

  // Combined categories: from noteCategories and any currently used in notes
  const allCategories = Array.from(new Set([...noteCategories, ...notes.map((n) => n.category)]));

  // Filtered notes list
  const filteredNotes = notes.filter((n) => {
    if (activeCategory !== 'all' && n.category !== activeCategory) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  }).sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  // ================= 1. NOTE CREATION & DELETION =================
  const handleCreateNewNote = () => {
    const today = new Date().toISOString().split('T')[0];
    const categoryToUse = activeCategory !== 'all' ? activeCategory : (allCategories[0] || 'Umum');
    const newNote = {
      title: 'Catatan Baru ' + (notes.length + 1),
      category: categoryToUse,
      tags: ['Ide'],
      content: `# Catatan Baru\n\nTuliskan konsep, materi penting, atau riset Anda di sini...\n\n- Poin utama\n- Referensi link\n`,
      isPinned: false,
    };
    addNote(newNote);
  };

  const handleConfirmDelete = () => {
    if (!noteToDelete) return;
    const deletedId = noteToDelete.id;
    deleteNote(deletedId);

    if (selectedNoteId === deletedId) {
      const remaining = notes.filter(n => n.id !== deletedId);
      setSelectedNoteId(remaining.length > 0 ? remaining[0].id : '');
    }

    setNoteToDelete(null);
  };

  // ================= 2. CATEGORY MANAGEMENT =================
  const handleSaveNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    addNoteCategory(trimmed);
    setActiveCategory(trimmed);
    if (activeNote) {
      updateNote(activeNote.id, { category: trimmed });
    }
    setNewCategoryName('');
    setIsAddCategoryOpen(false);
  };

  // ================= 3. MARKDOWN INSERTION & TAGS =================
  const handleInsertMarkdown = (prefix: string, suffix: string = '') => {
    if (!activeNote) return;
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end) || 'teks';
    const replacement = `${prefix}${selected}${suffix}`;
    const nextContent = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);

    updateNote(activeNote.id, { content: nextContent });

    // refocus cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (!activeNote || !newTagText.trim()) return;

    const trimmed = newTagText.trim().replace(/^#/, '');
    if (!activeNote.tags.includes(trimmed)) {
      updateNote(activeNote.id, { tags: [...activeNote.tags, trimmed] });
    }
    setNewTagText('');
    setIsAddingTag(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!activeNote) return;
    updateNote(activeNote.id, { tags: activeNote.tags.filter(t => t !== tagToRemove) });
  };

  // ================= 4. IMAGE INSERTION (UPLOAD & URL) =================
  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeNote) return;

    if (!file.type.startsWith('image/')) {
      showToast('Hanya file gambar (JPG, PNG, WebP, GIF) yang didukung', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const cleanFileName = file.name.replace(/\.[^/.]+$/, '');
      const markdownImage = `\n\n![${cleanFileName}](${dataUrl})\n\n`;

      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const nextContent = 
          textarea.value.substring(0, start) + 
          markdownImage + 
          textarea.value.substring(start);
        updateNote(activeNote.id, { content: nextContent });
      } else {
        updateNote(activeNote.id, { content: activeNote.content + markdownImage });
      }

      showToast(`Gambar "${file.name}" berhasil disisipkan ke catatan!`, 'success');
      setIsInsertImageOpen(false);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleInsertImageUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNote || !imageUrl.trim()) return;

    const alt = imageAlt.trim() || 'Gambar';
    const markdownImage = `\n\n![${alt}](${imageUrl.trim()})\n\n`;

    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const nextContent = 
        textarea.value.substring(0, start) + 
        markdownImage + 
        textarea.value.substring(start);
      updateNote(activeNote.id, { content: nextContent });
    } else {
      updateNote(activeNote.id, { content: activeNote.content + markdownImage });
    }

    showToast('Gambar via URL berhasil disisipkan!', 'success');
    setImageUrl('');
    setImageAlt('');
    setIsInsertImageOpen(false);
  };

  // Support paste image directly into editor textarea
  const handlePasteInTextarea = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!activeNote) return;
    const items = e.clipboardData.items;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (!blob) continue;

        e.preventDefault();
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          const markdownImage = `\n\n![Tangkapan Layar](${base64})\n\n`;

          const textarea = textareaRef.current;
          if (textarea) {
            const start = textarea.selectionStart;
            const nextContent = 
              textarea.value.substring(0, start) + 
              markdownImage + 
              textarea.value.substring(start);
            updateNote(activeNote.id, { content: nextContent });
          } else {
            updateNote(activeNote.id, { content: activeNote.content + markdownImage });
          }
          showToast('Gambar dari clipboard berhasil ditempel ke catatan!', 'success');
        };
        reader.readAsDataURL(blob);
        break;
      }
    }
  };

  // ================= 5. PDF CONVERSION =================
  const handleExportPDF = async () => {
    if (!activeNote) return;
    setIsExportingPdf(true);
    showToast('Menyiapkan dokumen PDF catatan...', 'info');

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      // Helper for page break
      const checkPageBreak = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
          return true;
        }
        return false;
      };

      // 1. Header Banner
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, 18, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, contentWidth, 18, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(79, 70, 229); // indigo
      doc.text('OMNIHUB KNOWLEDGE BASE', margin + 4, y + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Kategori: ${activeNote.category} • Diperbarui: ${activeNote.updatedAt}`, margin + 4, y + 13);

      doc.setFontSize(8);
      doc.text(`Penulis: ${profile.name}`, pageWidth - margin - 4, y + 10, { align: 'right' });

      y += 26;

      // 2. Note Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      const titleLines = doc.splitTextToSize(activeNote.title, contentWidth);
      doc.text(titleLines, margin, y);
      y += titleLines.length * 8 + 3;

      // 3. Tags bar
      if (activeNote.tags.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        const tagsString = 'Tags: ' + activeNote.tags.map(t => `#${t}`).join('  ');
        doc.text(tagsString, margin, y);
        y += 6;
      }

      // Horizontal separator line
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      // 4. Content Parsing (Headings, Paragraphs, Bullets, Images)
      const lines = activeNote.content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check for Markdown Images: ![alt](url)
        const imageMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
        if (imageMatch) {
          const imgUrl = imageMatch[2];
          checkPageBreak(65);

          try {
            // Embed image directly into PDF
            const imgHeight = 55;
            const imgWidth = Math.min(contentWidth, 110);
            doc.addImage(imgUrl, 'JPEG', margin, y, imgWidth, imgHeight);
            y += imgHeight + 4;

            if (imageMatch[1]) {
              doc.setFont('helvetica', 'italic');
              doc.setFontSize(8);
              doc.setTextColor(148, 163, 184);
              doc.text(`Gambar: ${imageMatch[1]}`, margin, y);
              y += 5;
            }
          } catch {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8);
            doc.setTextColor(156, 163, 175);
            doc.text(`[Gambar: ${imageMatch[1] || 'Embedded'}]`, margin, y);
            y += 6;
          }
          continue;
        }

        // H1
        if (line.startsWith('# ')) {
          checkPageBreak(12);
          y += 3;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(14);
          doc.setTextColor(30, 41, 59);
          const text = line.replace('# ', '');
          const split = doc.splitTextToSize(text, contentWidth);
          doc.text(split, margin, y);
          y += split.length * 6 + 2;
          continue;
        }

        // H2
        if (line.startsWith('## ')) {
          checkPageBreak(10);
          y += 2;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(51, 65, 85);
          const text = line.replace('## ', '');
          const split = doc.splitTextToSize(text, contentWidth);
          doc.text(split, margin, y);
          y += split.length * 5 + 2;
          continue;
        }

        // H3
        if (line.startsWith('### ')) {
          checkPageBreak(9);
          y += 2;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10.5);
          doc.setTextColor(71, 85, 105);
          const text = line.replace('### ', '');
          const split = doc.splitTextToSize(text, contentWidth);
          doc.text(split, margin, y);
          y += split.length * 5 + 1;
          continue;
        }

        // Bullet point
        if (line.startsWith('- ') || line.startsWith('* ')) {
          checkPageBreak(6);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(51, 65, 85);
          const bulletText = line.substring(2);
          const split = doc.splitTextToSize(bulletText, contentWidth - 8);
          doc.setFillColor(79, 70, 229);
          doc.circle(margin + 2, y - 1.2, 0.8, 'F');
          doc.text(split, margin + 6, y);
          y += split.length * 4.5 + 1.5;
          continue;
        }

        // Blockquote
        if (line.startsWith('> ')) {
          checkPageBreak(8);
          doc.setDrawColor(79, 70, 229);
          doc.setLineWidth(0.8);
          doc.line(margin, y - 2, margin, y + 4);
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(9);
          doc.setTextColor(100, 116, 139);
          const quoteText = line.replace('> ', '');
          const split = doc.splitTextToSize(quoteText, contentWidth - 6);
          doc.text(split, margin + 4, y);
          y += split.length * 4.5 + 2;
          continue;
        }

        // Code snippet
        if (line.startsWith('```')) {
          checkPageBreak(8);
          doc.setFillColor(241, 245, 249);
          doc.rect(margin, y - 3, contentWidth, 7, 'F');
          doc.setFont('courier', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(15, 23, 42);
          doc.text(line.replace(/```/g, ''), margin + 3, y + 1);
          y += 8;
          continue;
        }

        // Empty line
        if (line.trim() === '') {
          y += 3;
          continue;
        }

        // Normal paragraph
        checkPageBreak(6);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
        const cleanLine = line.replace(/[*_`]/g, '');
        const split = doc.splitTextToSize(cleanLine, contentWidth);
        doc.text(split, margin, y);
        y += split.length * 4.5 + 2;
      }

      // 5. Add Page Numbers
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Halaman ${p} dari ${totalPages} • Dibuat dengan OmniHub Knowledge Base`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Download
      const safeTitle = activeNote.title.replace(/[^a-zA-Z0-9_\-]/g, '_');
      doc.save(`${safeTitle}.pdf`);
      showToast('Catatan berhasil dikonversi dan diunduh sebagai PDF!', 'success');
    } catch (err) {
      console.error('Failed to export PDF', err);
      showToast('Gagal mengonversi catatan ke PDF', 'error');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportMarkdown = () => {
    if (!activeNote) return;
    const blob = new Blob([activeNote.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeNote.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Catatan berhasil diekspor sebagai berkas .md', 'success');
  };

  const handleCopyContent = () => {
    if (!activeNote) return;
    navigator.clipboard.writeText(activeNote.content);
    setCopied(true);
    showToast('Teks catatan disalin ke clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  // ================= 6. RENDER RICH MARKDOWN PREVIEW =================
  const renderSimpleMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');

    return (
      <div className="space-y-3 text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">
        {lines.map((line, idx) => {
          // 1. Render Markdown Image ![alt](url)
          const imgMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
          if (imgMatch) {
            const alt = imgMatch[1];
            const src = imgMatch[2];
            return (
              <div key={idx} className="my-3 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-950 p-1">
                <img
                  src={src}
                  alt={alt}
                  className="max-h-80 w-auto rounded-lg object-contain mx-auto"
                  onError={(e) => {
                    // Fallback for broken image url
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                {alt && (
                  <p className="text-[11px] text-center text-neutral-400 mt-1 italic">
                    {alt}
                  </p>
                )}
              </div>
            );
          }

          // 2. Headings
          if (line.startsWith('# ')) {
            return (
              <h1 key={idx} className="text-xl font-bold text-neutral-900 dark:text-neutral-100 pt-2 pb-1 border-b border-neutral-200 dark:border-neutral-800">
                {line.replace('# ', '')}
              </h1>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h2 key={idx} className="text-base font-semibold text-neutral-900 dark:text-neutral-100 pt-2">
                {line.replace('## ', '')}
              </h2>
            );
          }
          if (line.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {line.replace('### ', '')}
              </h3>
            );
          }

          // 3. Task checkboxes
          if (line.startsWith('- [ ] ')) {
            return (
              <div key={idx} className="flex items-center gap-2 text-xs sm:text-sm py-0.5">
                <Square className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span>{line.replace('- [ ] ', '')}</span>
              </div>
            );
          }
          if (line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
            return (
              <div key={idx} className="flex items-center gap-2 text-xs sm:text-sm text-neutral-400 line-through py-0.5">
                <CheckSquare className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>{line.substring(6)}</span>
              </div>
            );
          }

          // 4. Bullet lists
          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <li key={idx} className="ml-4 list-disc text-xs sm:text-sm">
                {line.substring(2)}
              </li>
            );
          }

          // 5. Blockquote
          if (line.startsWith('> ')) {
            return (
              <blockquote key={idx} className="border-l-3 border-indigo-500 pl-3 italic text-neutral-600 dark:text-neutral-400 py-1 bg-neutral-50 dark:bg-neutral-800/40 rounded-r text-xs sm:text-sm">
                {line.replace('> ', '')}
              </blockquote>
            );
          }

          // 6. Code block
          if (line.startsWith('```')) {
            return (
              <div key={idx} className="p-3 rounded-lg bg-neutral-900 text-neutral-200 font-mono text-xs overflow-x-auto">
                {line.replace(/```/g, '')}
              </div>
            );
          }

          // 7. Spacer
          if (line.trim() === '') {
            return <div key={idx} className="h-2" />;
          }

          // 8. Normal text with inline markdown highlighting
          return (
            <p key={idx} className="text-xs sm:text-sm">
              {line}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Knowledge Base & Catatan Ide
            </h2>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Tulis catatan markdown, sisipkan gambar, atur kategori, dan ekspor langsung ke PDF resmi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddCategoryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-all cursor-pointer"
          >
            <Folder className="w-4 h-4 text-amber-500" />
            <span>+ Kategori</span>
          </button>

          <button
            onClick={handleCreateNewNote}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Catatan Baru</span>
          </button>
        </div>
      </div>

      {/* Main 2-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        {/* Left Column (4 cols): Notes List & Categories */}
        <div className="lg:col-span-4 p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-col space-y-3">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Cari isi catatan atau tag..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
            />
          </div>

          {/* Category Chips Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 text-xs no-scrollbar">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              Semua ({notes.length})
            </button>
            {allCategories.map((cat) => {
              const count = notes.filter((n) => n.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeCategory === cat
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Notes Items List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[520px]">
            {filteredNotes.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 space-y-2">
                <FileText className="w-8 h-8 mx-auto opacity-40" />
                <p className="text-xs">Tidak ada catatan ditemukan.</p>
                <button
                  onClick={handleCreateNewNote}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                  + Tulis Catatan Baru
                </button>
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isSelected = activeNote?.id === note.id;

                return (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNoteId(note.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer group relative ${
                      isSelected
                        ? 'border-neutral-900 bg-neutral-100/90 dark:border-white dark:bg-neutral-800 shadow-xs'
                        : 'border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/30 hover:border-neutral-300 dark:hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate flex-1">
                        {note.title}
                      </p>
                      <div className="flex items-center gap-1">
                        {note.isPinned && (
                          <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                        )}
                        {/* Instant delete button on hover */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNoteToDelete(note);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-rose-500 transition-opacity rounded hover:bg-neutral-200 dark:hover:bg-neutral-700"
                          title="Hapus Catatan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                      {note.content.replace(/[#*`_!\[\]()]/g, '')}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between text-[10px] text-neutral-400">
                      <span className="px-1.5 py-0.5 rounded bg-neutral-200/60 dark:bg-neutral-700/60 font-medium text-neutral-700 dark:text-neutral-300">
                        {note.category}
                      </span>
                      <span className="font-mono">{note.updatedAt}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column (8 cols): Editor & Live Preview */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-col space-y-4">
          {activeNote ? (
            <>
              {/* Note Header Title, Category Dropdown, & Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex-1 min-w-[200px] flex items-center gap-2">
                  <input
                    type="text"
                    value={activeNote.title}
                    onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
                    className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 bg-transparent border-0 focus:outline-hidden w-full"
                    placeholder="Judul Catatan..."
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {/* Category Selector Badge */}
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs">
                    <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <select
                      value={activeNote.category}
                      onChange={(e) => updateNote(activeNote.id, { category: e.target.value })}
                      className="bg-transparent text-neutral-700 dark:text-neutral-300 text-xs font-semibold focus:outline-hidden cursor-pointer"
                    >
                      {allCategories.map((c) => (
                        <option key={c} value={c} className="dark:bg-neutral-800">
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Mode switcher */}
                  <div className="flex items-center p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                    <button
                      onClick={() => setEditorMode('edit')}
                      className={`p-1.5 rounded-md cursor-pointer ${editorMode === 'edit' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs' : 'text-neutral-400'}`}
                      title="Mode Edit Saja"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditorMode('split')}
                      className={`p-1.5 rounded-md hidden sm:block cursor-pointer ${editorMode === 'split' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs' : 'text-neutral-400'}`}
                      title="Split View (Tulis & Pratinjau)"
                    >
                      <div className="w-3.5 h-3.5 border border-current rounded-xs flex">
                        <div className="w-1/2 border-r border-current" />
                      </div>
                    </button>
                    <button
                      onClick={() => setEditorMode('preview')}
                      className={`p-1.5 rounded-md cursor-pointer ${editorMode === 'preview' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs' : 'text-neutral-400'}`}
                      title="Mode Pratinjau"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Pin button */}
                  <button
                    onClick={() => togglePinNote(activeNote.id)}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      activeNote.isPinned
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-neutral-600'
                    }`}
                    title={activeNote.isPinned ? 'Lepas Sematan' : 'Sematkan Catatan'}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>

                  {/* Copy button */}
                  <button
                    onClick={handleCopyContent}
                    className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors cursor-pointer"
                    title="Salin Markdown"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  {/* PDF Export Button (Requested) */}
                  <button
                    onClick={handleExportPDF}
                    disabled={isExportingPdf}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-semibold text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors cursor-pointer"
                    title="Konversi & Download PDF"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>

                  {/* Markdown (.md) Export */}
                  <button
                    onClick={handleExportMarkdown}
                    className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors cursor-pointer"
                    title="Download .md"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete Button with in-UI Modal */}
                  <button
                    onClick={() => setNoteToDelete(activeNote)}
                    className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-rose-500 transition-colors cursor-pointer"
                    title="Hapus Catatan Ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Tags Editor Bar */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <Tag className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                {activeNote.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-medium text-[11px]"
                  >
                    #{tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-rose-500 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {isAddingTag ? (
                  <div className="inline-flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="Nama tag..."
                      value={newTagText}
                      onChange={(e) => setNewTagText(e.target.value)}
                      onKeyDown={handleAddTag}
                      autoFocus
                      className="w-24 px-2 py-0.5 text-[11px] rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-1.5 py-0.5 rounded bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-[10px] font-bold"
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingTag(false)}
                      className="text-neutral-400 hover:text-neutral-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingTag(true)}
                    className="text-[11px] text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                  >
                    + Tambah Tag
                  </button>
                )}
              </div>

              {/* Formatting Toolbar */}
              {editorMode !== 'preview' && (
                <div className="flex flex-wrap items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800/70 rounded-xl text-neutral-600 dark:text-neutral-400">
                  <button
                    type="button"
                    onClick={() => handleInsertMarkdown('# ')}
                    className="p-1.5 rounded hover:bg-white dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                    title="Heading 1"
                  >
                    <Heading1 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertMarkdown('## ')}
                    className="p-1.5 rounded hover:bg-white dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                    title="Heading 2"
                  >
                    <Heading2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertMarkdown('**', '**')}
                    className="p-1.5 rounded hover:bg-white dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                    title="Tebal (Bold)"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertMarkdown('*', '*')}
                    className="p-1.5 rounded hover:bg-white dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                    title="Miring (Italic)"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertMarkdown('- ')}
                    className="p-1.5 rounded hover:bg-white dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                    title="Daftar Poin (Bullet List)"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertMarkdown('- [ ] ')}
                    className="p-1.5 rounded hover:bg-white dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                    title="Checkbox Todo"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertMarkdown('`', '`')}
                    className="p-1.5 rounded hover:bg-white dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                    title="Inline Code"
                  >
                    <Code className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertMarkdown('> ')}
                    className="p-1.5 rounded hover:bg-white dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                    title="Kutipan (Blockquote)"
                  >
                    <Quote className="w-3.5 h-3.5" />
                  </button>

                  <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700 mx-1" />

                  {/* Insert Image Button (Requested) */}
                  <button
                    type="button"
                    onClick={() => setIsInsertImageOpen(true)}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 font-semibold text-xs shadow-xs hover:bg-neutral-50 cursor-pointer"
                    title="Sisipkan Gambar (Upload File atau URL)"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Sisipkan Gambar</span>
                  </button>
                </div>
              )}

              {/* Editor & Preview Area */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[380px]">
                {/* Editor Textarea */}
                {(editorMode === 'edit' || editorMode === 'split') && (
                  <div className={`flex flex-col ${editorMode === 'edit' ? 'md:col-span-2' : ''}`}>
                    <textarea
                      ref={textareaRef}
                      value={activeNote.content}
                      onChange={(e) => updateNote(activeNote.id, { content: e.target.value })}
                      onPaste={handlePasteInTextarea}
                      className="w-full flex-1 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 text-xs sm:text-sm font-mono leading-relaxed text-neutral-900 dark:text-neutral-100 resize-none focus:outline-hidden min-h-[320px]"
                      placeholder="Mulai menulis catatan markdown... (Anda juga bisa Paste gambar langsung ke sini)"
                    />
                    <p className="text-[10px] text-neutral-400 mt-1 pl-1">
                      Tip: Tekan Ctrl+V untuk menempel gambar dari clipboard langsung ke dalam catatan.
                    </p>
                  </div>
                )}

                {/* Preview Box */}
                {(editorMode === 'preview' || editorMode === 'split') && (
                  <div className={`p-4 rounded-xl bg-neutral-50/50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-neutral-800 overflow-y-auto max-h-[500px] ${editorMode === 'preview' ? 'md:col-span-2' : ''}`}>
                    {renderSimpleMarkdown(activeNote.content)}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-24 text-center text-neutral-400 space-y-3">
              <FileText className="w-12 h-12 mx-auto opacity-30 text-neutral-500" />
              <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                Belum ada catatan yang dipilih
              </p>
              <button
                onClick={handleCreateNewNote}
                className="px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold text-xs shadow-xs"
              >
                + Buat Catatan Pertama
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL: ADD CATEGORY ================= */}
      {isAddCategoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div 
            className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Tambah Kategori Catatan
                </h3>
              </div>
              <button
                onClick={() => setIsAddCategoryOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Nama Kategori Baru
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Kuliah, Riset Pasar, Resep, Buku"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCategoryOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!newCategoryName.trim()}
                  className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 disabled:opacity-50"
                >
                  Simpan Kategori
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: INSERT IMAGE ================= */}
      {isInsertImageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div 
            className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-indigo-500" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Sisipkan Gambar ke Catatan
                </h3>
              </div>
              <button
                onClick={() => setIsInsertImageOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab switch */}
            <div className="grid grid-cols-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setImageInsertTab('upload')}
                className={`py-1.5 rounded-lg text-center transition-all ${
                  imageInsertTab === 'upload'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500'
                }`}
              >
                Unggah File Gambar
              </button>
              <button
                type="button"
                onClick={() => setImageInsertTab('url')}
                className={`py-1.5 rounded-lg text-center transition-all ${
                  imageInsertTab === 'url'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500'
                }`}
              >
                Gunakan Link URL
              </button>
            </div>

            {imageInsertTab === 'upload' ? (
              <div className="space-y-4 py-2">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl p-8 text-center hover:border-indigo-500 transition-colors cursor-pointer bg-neutral-50 dark:bg-neutral-800/40"
                >
                  <Upload className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    Klik untuk memilih file gambar
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Mendukung JPG, PNG, WebP, GIF (Gambar disimpan lokal di browser)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <form onSubmit={handleInsertImageUrl} className="space-y-3 py-2">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    URL Gambar (Direct Image Link)
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... atau link foto"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Keterangan Gambar (Alt Text)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Diagram Arsitektur Database"
                    value={imageAlt}
                    onChange={(e) => setImageAlt(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsInsertImageOpen(false)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={!imageUrl.trim()}
                    className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 disabled:opacity-50"
                  >
                    Sisipkan Gambar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: INLINE DELETE CONFIRMATION ================= */}
      {noteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div 
            className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-500 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Hapus Catatan?
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
                  "{noteToDelete.title}"
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300">
              Apakah Anda yakin ingin menghapus catatan ini? Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNoteToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
