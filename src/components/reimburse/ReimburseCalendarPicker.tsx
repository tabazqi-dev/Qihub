import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Check, 
  CheckSquare, 
  Square, 
  Trash2, 
  Sparkles,
  Info,
  Clock
} from 'lucide-react';
import { ReimburseProjectType } from '../../types';

interface ReimburseCalendarPickerProps {
  selectedDates: string[]; // array of YYYY-MM-DD
  onChangeDates: (newDates: string[]) => void;
  typeProject: ReimburseProjectType;
  wdRate: number;
  weRate: number;
  initialMonthDate?: string; // YYYY-MM-DD to focus on
  readOnly?: boolean;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES = [
  { label: 'Sen', full: 'Senin', isWeekend: false },
  { label: 'Sel', full: 'Selasa', isWeekend: false },
  { label: 'Rab', full: 'Rabu', isWeekend: false },
  { label: 'Kam', full: 'Kamis', isWeekend: false },
  { label: 'Jum', full: 'Jumat', isWeekend: false },
  { label: 'Sab', full: 'Sabtu', isWeekend: true },
  { label: 'Min', full: 'Minggu', isWeekend: true },
];

export const ReimburseCalendarPicker: React.FC<ReimburseCalendarPickerProps> = ({
  selectedDates,
  onChangeDates,
  typeProject,
  wdRate,
  weRate,
  initialMonthDate,
  readOnly = false
}) => {
  // Current viewed month and year
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (initialMonthDate) {
      const d = new Date(initialMonthDate);
      if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    if (selectedDates.length > 0) {
      const d = new Date(selectedDates[0]);
      if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    return new Date();
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed

  // Navigation handlers
  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleSetYearMonth = (newYear: number, newMonth: number) => {
    setViewDate(new Date(newYear, newMonth, 1));
  };

  // Days in current month
  const daysInMonth = useMemo(() => {
    return new Date(year, month + 1, 0).getDate();
  }, [year, month]);

  // First day of month (Monday = 0, Sunday = 6)
  const startDayOffset = useMemo(() => {
    const day = new Date(year, month, 1).getDay();
    // JS getDay(): 0 = Sun, 1 = Mon, ..., 6 = Sat
    // Convert to Monday = 0: (day + 6) % 7
    return (day + 6) % 7;
  }, [year, month]);

  // Format date helper: YYYY-MM-DD
  const formatDateStr = (dayNum: number): string => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(dayNum).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  // Check if date string is weekend
  const isDateWeekend = (dateStr: string): boolean => {
    const d = new Date(dateStr);
    const day = d.getDay();
    return day === 0 || day === 6;
  };

  // Toggle single date
  const handleToggleDate = (dayNum: number) => {
    if (readOnly) return;
    const dateStr = formatDateStr(dayNum);
    if (selectedDates.includes(dateStr)) {
      onChangeDates(selectedDates.filter(d => d !== dateStr));
    } else {
      const updated = [...selectedDates, dateStr].sort();
      onChangeDates(updated);
    }
  };

  // Bulk actions for current month
  const handleSelectAllWeekdays = () => {
    const newDates = new Set(selectedDates);
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateStr(day);
      if (!isDateWeekend(dateStr)) {
        newDates.add(dateStr);
      }
    }
    onChangeDates(Array.from(newDates).sort());
  };

  const handleSelectAllDays = () => {
    const newDates = new Set(selectedDates);
    for (let day = 1; day <= daysInMonth; day++) {
      newDates.add(formatDateStr(day));
    }
    onChangeDates(Array.from(newDates).sort());
  };

  const handleClearCurrentMonth = () => {
    const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const remaining = selectedDates.filter(d => !d.startsWith(currentMonthPrefix));
    onChangeDates(remaining);
  };

  // Range selection dialog state inside calendar
  const [rangeStartDay, setRangeStartDay] = useState<number>(1);
  const [rangeEndDay, setRangeEndDay] = useState<number>(Math.min(15, daysInMonth));
  const [isRangeOpen, setIsRangeOpen] = useState(false);

  const handleApplyRange = () => {
    const s = Math.min(rangeStartDay, rangeEndDay);
    const e = Math.max(rangeStartDay, rangeEndDay);
    const newDates = new Set(selectedDates);
    for (let day = s; day <= e; day++) {
      newDates.add(formatDateStr(day));
    }
    onChangeDates(Array.from(newDates).sort());
    setIsRangeOpen(false);
  };

  // Calculated breakdown of selected dates
  const breakdown = useMemo(() => {
    let wdCount = 0;
    let weCount = 0;
    selectedDates.forEach(dateStr => {
      if (isDateWeekend(dateStr)) {
        weCount++;
      } else {
        wdCount++;
      }
    });

    const isOnline = typeProject === 'Online';
    const multiplier = isOnline ? 2 : 1;
    const wdMultiplier = wdCount * multiplier;
    const weMultiplier = weCount * multiplier;
    const wdTotalAmount = wdMultiplier * wdRate;
    const weTotalAmount = weMultiplier * weRate;
    const totalAmount = wdTotalAmount + weTotalAmount;
    const totalCalendarDays = selectedDates.length;

    return {
      wdCount,
      weCount,
      wdMultiplier,
      weMultiplier,
      wdTotalAmount,
      weTotalAmount,
      totalAmount,
      totalCalendarDays,
      isOnline
    };
  }, [selectedDates, typeProject, wdRate, weRate]);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
      {/* Calendar Header with Month Selector & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-700/60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span>Klik Kalender Hari Kerja</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold">
                {selectedDates.length} Hari Terpilih
              </span>
            </h4>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Pilih tanggal spesifik Anda bekerja di properti/klien ini
            </p>
          </div>
        </div>

        {/* Month Navigation Controls */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-white dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors"
            title="Bulan sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 font-mono text-xs font-bold px-2 py-1 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <select
              value={month}
              onChange={(e) => handleSetYearMonth(year, parseInt(e.target.value, 10))}
              className="bg-transparent text-neutral-900 dark:text-neutral-100 font-bold cursor-pointer text-xs focus:outline-hidden"
            >
              {MONTH_NAMES.map((mName, idx) => (
                <option key={idx} value={idx} className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
                  {mName}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => handleSetYearMonth(parseInt(e.target.value, 10), month)}
              className="bg-transparent text-neutral-900 dark:text-neutral-100 font-bold cursor-pointer text-xs focus:outline-hidden"
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y} className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-white dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors"
            title="Bulan berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Selection Presets Bar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleSelectAllWeekdays}
            className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 font-semibold transition-colors cursor-pointer"
          >
            + Semua Weekdays ({MONTH_NAMES[month]})
          </button>
          <button
            type="button"
            onClick={handleSelectAllDays}
            className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-700/60 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 font-medium transition-colors cursor-pointer"
          >
            + Semua Hari (WD+WE)
          </button>
          <button
            type="button"
            onClick={() => setIsRangeOpen(!isRangeOpen)}
            className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-700/60 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 font-medium transition-colors cursor-pointer"
          >
            Pilih Rentang...
          </button>
        </div>

        {selectedDates.length > 0 && (
          <button
            type="button"
            onClick={handleClearCurrentMonth}
            className="flex items-center gap-1 text-rose-600 dark:text-rose-400 hover:underline font-semibold cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span>Bersihkan Bulan Ini</span>
          </button>
        )}
      </div>
      )}

      {/* Popdown Range Selector within Month */}
      {isRangeOpen && (
        <div className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 space-y-2 animate-in fade-in duration-100">
          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
            Pilih Rentang Tanggal di {MONTH_NAMES[month]} {year}:
          </span>
          <div className="flex items-center gap-2 text-xs">
            <span>Dari tanggal</span>
            <input
              type="number"
              min={1}
              max={daysInMonth}
              value={rangeStartDay}
              onChange={(e) => setRangeStartDay(parseInt(e.target.value || '1', 10))}
              className="w-16 px-2 py-1 rounded-lg border text-center font-mono font-bold"
            />
            <span>sampai</span>
            <input
              type="number"
              min={1}
              max={daysInMonth}
              value={rangeEndDay}
              onChange={(e) => setRangeEndDay(parseInt(e.target.value || String(daysInMonth), 10))}
              className="w-16 px-2 py-1 rounded-lg border text-center font-mono font-bold"
            />
            <button
              type="button"
              onClick={handleApplyRange}
              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
            >
              Pilih Rentang
            </button>
            <button
              type="button"
              onClick={() => setIsRangeOpen(false)}
              className="px-2 py-1 rounded-lg border text-neutral-500 hover:bg-neutral-100 cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="border border-neutral-200 dark:border-neutral-700 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 shadow-xs">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-neutral-200 dark:border-neutral-800 text-center font-bold text-[11px]">
          {DAY_NAMES.map((d, idx) => (
            <div
              key={idx}
              className={`py-2 px-1 ${
                d.isWeekend
                  ? 'bg-rose-100/80 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                  : 'bg-neutral-100/70 dark:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              <span>{d.label}</span>
              <span className="block text-[9px] font-normal opacity-70">
                {d.isWeekend ? 'WE' : 'WD'}
              </span>
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-neutral-100 dark:divide-neutral-800/60">
          {/* Empty cells before month starts */}
          {Array.from({ length: startDayOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="h-14 sm:h-16 bg-neutral-50/40 dark:bg-neutral-900/40" />
          ))}

          {/* Month days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = formatDateStr(dayNum);
            const isWeekend = isDateWeekend(dateStr);
            const isSelected = selectedDates.includes(dateStr);
            const isToday = dateStr === todayStr;

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => handleToggleDate(dayNum)}
                className={`h-14 sm:h-16 p-1.5 flex flex-col justify-between items-stretch text-left transition-all relative group cursor-pointer ${
                  isSelected
                    ? isWeekend
                      ? 'bg-amber-100/90 dark:bg-amber-950/60 ring-2 ring-amber-500 ring-inset'
                      : 'bg-indigo-100/90 dark:bg-indigo-950/60 ring-2 ring-indigo-500 ring-inset'
                    : isWeekend
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-950/40'
                    : 'bg-white dark:bg-neutral-900 hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60'
                }`}
                title={`${dateStr} (${isWeekend ? 'Weekend / WE' : 'Weekday / WD'}) - Klik untuk ${isSelected ? 'batalkan' : 'pilih'}`}
              >
                {/* Top: Day Number & Today indicator */}
                <div className="flex items-center justify-between">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                    isToday
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                      : isSelected
                      ? isWeekend
                        ? 'text-amber-900 dark:text-amber-200 font-extrabold'
                        : 'text-indigo-900 dark:text-indigo-200 font-extrabold'
                      : isWeekend
                      ? 'text-rose-600 dark:text-rose-400 font-semibold'
                      : 'text-neutral-700 dark:text-neutral-300 font-semibold'
                  }`}>
                    {dayNum}
                  </span>

                  {/* Checked indicator */}
                  {isSelected && (
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-white ${
                      isWeekend ? 'bg-amber-500' : 'bg-indigo-600'
                    }`}>
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>

                {/* Bottom: Badge WD / WE & status */}
                <div className="flex items-center justify-between mt-auto">
                  <span className={`text-[9px] font-mono font-bold px-1 rounded ${
                    isSelected
                      ? isWeekend
                        ? 'bg-amber-500 text-white'
                        : 'bg-indigo-600 text-white'
                      : isWeekend
                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                  }`}>
                    {isWeekend ? 'WE' : 'WD'}
                  </span>

                  {isSelected && typeProject === 'Online' && (
                    <span className="text-[9px] font-mono font-semibold text-amber-700 dark:text-amber-300">
                      2 sesi
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Breakdown Stats Bar */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
              Ringkasan Hari Kerja Terpilih:
            </span>
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono text-xs font-extrabold">
              {breakdown.totalCalendarDays} Hari Kerja
            </span>
          </div>

          {selectedDates.length > 0 && (
            <div className="text-[11px] text-neutral-500 font-mono">
              Periode: <strong>{selectedDates[0]}</strong> s/d <strong>{selectedDates[selectedDates.length - 1]}</strong>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1 border-t border-neutral-100 dark:border-neutral-800">
          <div className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/40">
            <span className="text-[10px] text-neutral-400 block">Weekday (WD)</span>
            <span className="font-bold text-neutral-900 dark:text-neutral-100">
              {breakdown.wdCount} Hari {breakdown.isOnline ? `(${breakdown.wdMultiplier} sesi)` : ''}
            </span>
            <span className="text-[10px] text-neutral-500 block">
              Rp {breakdown.wdTotalAmount.toLocaleString('id-ID')}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/40">
            <span className="text-[10px] text-neutral-400 block">Weekend (WE)</span>
            <span className="font-bold text-neutral-900 dark:text-neutral-100">
              {breakdown.weCount} Hari {breakdown.isOnline ? `(${breakdown.weMultiplier} sesi)` : ''}
            </span>
            <span className="text-[10px] text-neutral-500 block">
              Rp {breakdown.weTotalAmount.toLocaleString('id-ID')}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/40">
            <span className="text-[10px] text-neutral-400 block">Total Hari Kerja</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {breakdown.totalCalendarDays} Hari
            </span>
            <span className="text-[10px] text-neutral-500 block">
              {breakdown.isOnline ? `${breakdown.wdMultiplier + breakdown.weMultiplier} total sesi` : 'Hari kalender'}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold">Total Klaim</span>
            <span className="font-extrabold text-emerald-700 dark:text-emerald-300 text-sm">
              Rp {breakdown.totalAmount.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
