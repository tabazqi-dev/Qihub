import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { buildXlsxBlob } from '../../utils/xlsxExport';
import {
  ClipboardList,
  Plus,
  Trash2,
  Pencil,
  FileSpreadsheet,
  X,
  RotateCcw,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const getLocalToday = () => new Date().toLocaleDateString('en-CA');

const getLocalYesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('en-CA');
};

const isoToDmy = (iso: string): string => {
  if (!iso) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return iso;
  return `${match[3]}/${match[2]}/${match[1]}`;
};

const dmyToIso = (dmy: string): string | null => {
  const clean = dmy.trim();
  if (!clean) return '';
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(clean);
  if (!match) return null;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) {
    return null;
  }
  return `${match[3]}-${match[2]}-${match[1]}`;
};

const formatDmyInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(parsed);
};

export const LogbookView: React.FC = () => {
  const { logbookEntries, addLogbookEntry, updateLogbookEntry, deleteLogbookEntry, showToast } = useApp();

  const [date, setDate] = useState(getLocalToday);
  const [dateInput, setDateInput] = useState(() => isoToDmy(getLocalToday()));
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filter period state (ISO YYYY-MM-DD internally + DD/MM/YYYY display)
  const [startDateFilter, setStartDateFilter] = useState('');
  const [startFilterInput, setStartFilterInput] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [endFilterInput, setEndFilterInput] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const datePickerRef = useRef<HTMLInputElement>(null);
  const startPickerRef = useRef<HTMLInputElement>(null);
  const endPickerRef = useRef<HTMLInputElement>(null);

  const applyFormDateIso = (iso: string) => {
    setDate(iso);
    setDateInput(isoToDmy(iso));
  };

  const handleDateTextChange = (raw: string) => {
    const formatted = formatDmyInput(raw);
    setDateInput(formatted);
    if (formatted.length === 10) {
      const parsed = dmyToIso(formatted);
      if (parsed) {
        setDate(parsed);
      }
    }
  };

  const handleFilterDateTextChange = (kind: 'start' | 'end', raw: string) => {
    const formatted = formatDmyInput(raw);
    if (kind === 'start') {
      setStartFilterInput(formatted);
      if (!formatted) {
        setStartDateFilter('');
      } else if (formatted.length === 10) {
        const parsed = dmyToIso(formatted);
        if (parsed) setStartDateFilter(parsed);
      }
    } else {
      setEndFilterInput(formatted);
      if (!formatted) {
        setEndDateFilter('');
      } else if (formatted.length === 10) {
        const parsed = dmyToIso(formatted);
        if (parsed) setEndDateFilter(parsed);
      }
    }
  };

  const openNativePicker = (input: HTMLInputElement | null) => {
    if (!input) return;
    const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof pickerInput.showPicker === 'function') {
      pickerInput.showPicker();
    } else {
      pickerInput.click();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedIso = dmyToIso(dateInput);
    if (!resolvedIso) {
      showToast('Format tanggal harus DD/MM/YYYY yang valid (contoh: 25/02/2026)', 'warning');
      return;
    }
    if (!description.trim()) {
      showToast('Catatan pekerjaan harian wajib diisi', 'warning');
      return;
    }

    if (editingId) {
      updateLogbookEntry(editingId, {
        date: resolvedIso,
        description: description.trim()
      });
      showToast('Catatan logbook berhasil diperbarui!', 'success');
      setEditingId(null);
    } else {
      addLogbookEntry({
        date: resolvedIso,
        project: 'Daily Log',
        hours: 0,
        category: 'Daily',
        description: description.trim(),
        status: 'Completed'
      });
      setCurrentPage(1);
    }

    setDescription('');
    applyFormDateIso(getLocalToday());
  };

  const handleStartEdit = (id: string, currentDate: string, currentDesc: string) => {
    setEditingId(id);
    applyFormDateIso(currentDate);
    setDescription(currentDesc);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    applyFormDateIso(getLocalToday());
    setDescription('');
  };

  const filteredEntries = useMemo(() => {
    return logbookEntries
      .filter(entry => {
        if (startDateFilter && entry.date < startDateFilter) return false;
        if (endDateFilter && entry.date > endDateFilter) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [logbookEntries, startDateFilter, endDateFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  useEffect(() => {
    setCurrentPage(1);
  }, [startDateFilter, endDateFilter, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedEntries = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * itemsPerPage;
    return filteredEntries.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredEntries, safeCurrentPage, itemsPerPage]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | 'ellipsis-left' | 'ellipsis-right')[] = [1];
    const start = Math.max(2, safeCurrentPage - 1);
    const end = Math.min(totalPages - 1, safeCurrentPage + 1);

    if (start > 2) pages.push('ellipsis-left');
    for (let p = start; p <= end; p++) pages.push(p);
    if (end < totalPages - 1) pages.push('ellipsis-right');
    pages.push(totalPages);
    return pages;
  }, [totalPages, safeCurrentPage]);

  const startItemIndex = filteredEntries.length === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1;
  const endItemIndex = Math.min(safeCurrentPage * itemsPerPage, filteredEntries.length);

  // Export genuine XLSX with clean separated columns: No | Tanggal | Detail Kerjaan
  const handleExportXLSX = () => {
    const orderedForExport = [...filteredEntries].sort((a, b) => a.date.localeCompare(b.date));
    const columns = [
      { header: 'No', width: 8 },
      { header: 'Tanggal', width: 18 },
      { header: 'Detail Kerjaan', width: 72 },
    ];
    const rows: (string | number)[][] = orderedForExport.map((e, idx) => [
      idx + 1,
      isoToDmy(e.date),
      e.description,
    ]);

    const blob = buildXlsxBlob('Logbook Harian', columns, rows);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const startLabel = startDateFilter ? isoToDmy(startDateFilter).replace(/\//g, '-') : 'semua';
    const endLabel = endDateFilter ? isoToDmy(endDateFilter).replace(/\//g, '-') : 'sekarang';
    link.setAttribute('download', `Logbook_Harian_${startLabel}_sd_${endLabel}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Logbook berhasil diekspor ke file Excel (.xlsx) dengan kolom terpisah!', 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xl shadow-xs">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Logbook Kerja Harian
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Catat apa saja yang Anda kerjakan setiap hari dan ekspor rekap periode ke Excel (.xlsx).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 font-mono text-xs font-bold text-neutral-700 dark:text-neutral-300">
            {filteredEntries.length} Catatan Harian
          </div>
        </div>
      </div>

      {/* Main Grid: Input Form & Logbook List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Add / Edit Daily Logbook */}
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4 h-fit">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              {editingId ? <Pencil className="w-4 h-4 text-amber-500" /> : <Plus className="w-4 h-4 text-indigo-500" />}
              <span>{editingId ? 'Edit Catatan Harian' : 'Catat Pekerjaan Hari Ini'}</span>
            </h3>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Batal</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Tanggal (DD/MM/YYYY)
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyFormDateIso(getLocalToday())}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                      date === getLocalToday()
                        ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    Hari Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormDateIso(getLocalYesterday())}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                      date === getLocalYesterday()
                        ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    Kemarin
                  </button>
                </div>
              </div>
              <div className="relative flex items-center">
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={10}
                  placeholder="DD/MM/YYYY"
                  value={dateInput}
                  onChange={(e) => handleDateTextChange(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs font-mono text-neutral-900 dark:text-neutral-100"
                />
                <button
                  type="button"
                  onClick={() => openNativePicker(datePickerRef.current)}
                  className="absolute right-2.5 p-1 rounded-lg text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                  title="Pilih dari kalender"
                >
                  <Calendar className="w-4 h-4" />
                </button>
                <input
                  ref={datePickerRef}
                  type="date"
                  value={date}
                  onChange={(e) => {
                    if (e.target.value) applyFormDateIso(e.target.value);
                  }}
                  tabIndex={-1}
                  aria-hidden="true"
                  className="sr-only"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Apa yang Anda kerjakan?
              </label>
              <textarea
                rows={6}
                maxLength={2000}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={'Tuliskan daftar pekerjaan atau aktivitas hari itu...\nContoh:\n- Follow up tagihan klien\n- Update laporan keuangan bulanan\n- Koordinasi tim operasional'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 resize-y font-sans leading-relaxed"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold text-xs hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors cursor-pointer shadow-sm"
            >
              {editingId ? 'Simpan Perubahan' : 'Simpan Catatan Harian'}
            </button>
          </form>
        </div>

        {/* Right List & Export Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Period Filter & Export Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-400">Dari:</span>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="DD/MM/YYYY"
                    value={startFilterInput}
                    onChange={(e) => handleFilterDateTextChange('start', e.target.value)}
                    className="w-32 pl-2.5 pr-7 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-mono text-neutral-900 dark:text-neutral-100"
                  />
                  <button
                    type="button"
                    onClick={() => openNativePicker(startPickerRef.current)}
                    className="absolute right-1.5 p-0.5 text-neutral-400 hover:text-indigo-600 cursor-pointer"
                    title="Pilih tanggal mulai"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                  </button>
                  <input
                    ref={startPickerRef}
                    type="date"
                    value={startDateFilter}
                    onChange={(e) => {
                      setStartDateFilter(e.target.value);
                      setStartFilterInput(isoToDmy(e.target.value));
                    }}
                    tabIndex={-1}
                    aria-hidden="true"
                    className="sr-only"
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-neutral-400">s/d:</span>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="DD/MM/YYYY"
                    value={endFilterInput}
                    onChange={(e) => handleFilterDateTextChange('end', e.target.value)}
                    className="w-32 pl-2.5 pr-7 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-mono text-neutral-900 dark:text-neutral-100"
                  />
                  <button
                    type="button"
                    onClick={() => openNativePicker(endPickerRef.current)}
                    className="absolute right-1.5 p-0.5 text-neutral-400 hover:text-indigo-600 cursor-pointer"
                    title="Pilih tanggal akhir"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                  </button>
                  <input
                    ref={endPickerRef}
                    type="date"
                    value={endDateFilter}
                    onChange={(e) => {
                      setEndDateFilter(e.target.value);
                      setEndFilterInput(isoToDmy(e.target.value));
                    }}
                    tabIndex={-1}
                    aria-hidden="true"
                    className="sr-only"
                  />
                </div>
              </div>

              {(startDateFilter || endDateFilter || startFilterInput || endFilterInput) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDateFilter('');
                    setStartFilterInput('');
                    setEndDateFilter('');
                    setEndFilterInput('');
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                  title="Reset filter periode"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleExportXLSX}
              className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm cursor-pointer shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Ekspor Periode ke XLSX</span>
            </button>
          </div>

          {/* Logbook Entries List */}
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                Riwayat Logbook Harian ({filteredEntries.length})
              </h3>

              {filteredEntries.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <label htmlFor="logbook-per-page" className="text-neutral-500 dark:text-neutral-400">
                    Tampilkan:
                  </label>
                  <select
                    id="logbook-per-page"
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 cursor-pointer"
                  >
                    {[5, 10, 20, 50].map((size) => (
                      <option key={size} value={size}>
                        {size} / halaman
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {filteredEntries.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 space-y-2">
                <ClipboardList className="w-8 h-8 mx-auto opacity-40" />
                <p className="text-xs">Belum ada catatan logbook pada periode ini.</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {paginatedEntries.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                        editingId === item.id
                          ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700'
                          : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800'
                      }`}
                    >
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-mono">
                            {isoToDmy(item.date)}
                          </span>
                          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                            {formatDisplayDate(item.date)}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 font-sans whitespace-pre-line leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 self-end sm:self-start shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item.id, item.date, item.description)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-indigo-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                          title="Edit Catatan"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (editingId === item.id) handleCancelEdit();
                            deleteLogbookEntry(item.id);
                          }}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                          title="Hapus Catatan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Bar */}
                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <p className="text-neutral-500 dark:text-neutral-400 tabular-nums">
                    Menampilkan <span className="font-semibold text-neutral-800 dark:text-neutral-200">{startItemIndex}–{endItemIndex}</span> dari{' '}
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">{filteredEntries.length}</span> catatan
                  </p>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        type="button"
                        disabled={safeCurrentPage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                        title="Halaman Sebelumnya"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Prev</span>
                      </button>

                      {pageNumbers.map((pageItem) => {
                        if (typeof pageItem !== 'number') {
                          return (
                            <span
                              key={pageItem}
                              className="px-1.5 text-neutral-400 select-none"
                            >
                              ...
                            </span>
                          );
                        }
                        const isActive = pageItem === safeCurrentPage;
                        return (
                          <button
                            key={pageItem}
                            type="button"
                            onClick={() => setCurrentPage(pageItem)}
                            className={`min-w-[30px] h-7 px-2 rounded-lg font-mono font-semibold transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                                : 'border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                            }`}
                          >
                            {pageItem}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        disabled={safeCurrentPage >= totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                        title="Halaman Berikutnya"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
