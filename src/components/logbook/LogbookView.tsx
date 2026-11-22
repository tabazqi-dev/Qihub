import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ClipboardList,
  Plus,
  Trash2,
  Pencil,
  FileSpreadsheet,
  X,
  RotateCcw
} from 'lucide-react';

const getLocalToday = () => new Date().toLocaleDateString('en-CA');

const getLocalYesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('en-CA');
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
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filter period state
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !description.trim()) {
      showToast('Tanggal dan catatan pekerjaan harian wajib diisi', 'warning');
      return;
    }

    if (editingId) {
      updateLogbookEntry(editingId, {
        date,
        description: description.trim()
      });
      showToast('Catatan logbook berhasil diperbarui!', 'success');
      setEditingId(null);
    } else {
      addLogbookEntry({
        date,
        project: 'Daily Log',
        hours: 0,
        category: 'Daily',
        description: description.trim(),
        status: 'Completed'
      });
    }

    setDescription('');
    setDate(getLocalToday());
  };

  const handleStartEdit = (id: string, currentDate: string, currentDesc: string) => {
    setEditingId(id);
    setDate(currentDate);
    setDescription(currentDesc);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setDate(getLocalToday());
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

  // Export to XLSX (Excel compatible TSV)
  const handleExportXLSX = () => {
    const orderedForExport = [...filteredEntries].sort((a, b) => a.date.localeCompare(b.date));
    const headers = ['No', 'Tanggal', 'Pekerjaan / Aktivitas Harian'];
    const rows = orderedForExport.map((e, idx) => [
      idx + 1,
      e.date,
      `"${e.description.replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Logbook_Harian_${startDateFilter || 'semua'}_sd_${endDateFilter || 'sekarang'}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Logbook berhasil diekspor ke format Excel (.xls / .xlsx)!', 'success');
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
              Catat apa saja yang Anda kerjakan setiap hari dan ekspor rekap periode ke Excel.
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
                  Tanggal
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDate(getLocalToday())}
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
                    onClick={() => setDate(getLocalYesterday())}
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
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs font-mono text-neutral-900 dark:text-neutral-100"
              />
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
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-mono text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-neutral-400">s/d:</span>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-mono text-neutral-900 dark:text-neutral-100"
                />
              </div>

              {(startDateFilter || endDateFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDateFilter('');
                    setEndDateFilter('');
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
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
              Riwayat Logbook Harian ({filteredEntries.length})
            </h3>

            {filteredEntries.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 space-y-2">
                <ClipboardList className="w-8 h-8 mx-auto opacity-40" />
                <p className="text-xs">Belum ada catatan logbook pada periode ini.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEntries.map((item) => (
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
                          {item.date}
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
