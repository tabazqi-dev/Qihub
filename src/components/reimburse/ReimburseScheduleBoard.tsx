import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Building2, 
  CheckCircle2, 
  Filter,
  Sparkles,
  ExternalLink,
  Layers
} from 'lucide-react';
import { ReimbursementItem, ReimburseRole, ReimburseProjectType } from '../../types';
import { formatDisplayDate } from './ReimburseView';

interface ReimburseScheduleBoardProps {
  reimbursements: ReimbursementItem[];
  onOpenNewWithDate?: (dateStr: string) => void;
  onEditItem?: (item: ReimbursementItem) => void;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_ABBR = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export const ReimburseScheduleBoard: React.FC<ReimburseScheduleBoardProps> = ({
  reimbursements,
  onOpenNewWithDate,
  onEditItem
}) => {
  // Current viewed month and year (Default to September 2026 based on user spreadsheet, or current year)
  const [viewDate, setViewDate] = useState<Date>(() => {
    // Check if there are reimbursements with dates in 2026
    const has2026 = reimbursements.find(r => r.startDate.startsWith('2026-09') || r.startDate.startsWith('2026-10'));
    if (has2026) {
      return new Date(2026, 8, 1); // September 2026
    }
    return new Date();
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed

  // Days in month
  const daysInMonth = useMemo(() => {
    return new Date(year, month + 1, 0).getDate();
  }, [year, month]);

  // Days array for the month
  const daysArray = useMemo(() => {
    const list: { dayNum: number; dateStr: string; dayAbbr: string; isWeekend: boolean }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dayOfWeek = dateObj.getDay(); // 0 = Sun, 6 = Sat
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      list.push({
        dayNum: d,
        dateStr: `${year}-${mStr}-${dStr}`,
        dayAbbr: DAY_ABBR[dayOfWeek],
        isWeekend
      });
    }
    return list;
  }, [year, month, daysInMonth]);

  // Check if a reimbursement applies to a specific date
  const isItemActiveOnDate = (item: ReimbursementItem, dateStr: string): boolean => {
    // 1. If explicit selectedDates exists
    if (item.selectedDates && item.selectedDates.length > 0) {
      return item.selectedDates.includes(dateStr);
    }
    // 2. Otherwise check range
    if (!item.startDate || !item.endDate) return false;
    const s = item.startDate <= item.endDate ? item.startDate : item.endDate;
    const e = item.startDate <= item.endDate ? item.endDate : item.startDate;
    return dateStr >= s && dateStr <= e;
  };

  // Filter items that have any active day in this month
  const activeItemsThisMonth = useMemo(() => {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return reimbursements.filter(item => {
      // Check if dates intersect
      if (item.selectedDates && item.selectedDates.length > 0) {
        return item.selectedDates.some(d => d.startsWith(monthPrefix));
      }
      return daysArray.some(d => isItemActiveOnDate(item, d.dateStr));
    });
  }, [reimbursements, year, month, daysArray]);

  return (
    <div className="space-y-4">
      {/* Header with Title and Month Navigation */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100">
                Papan Jadwal Kerja Proyek (Kalender Bulanan)
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-mono text-[10px] font-bold">
                Sabtu/Minggu Pink
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Format matriks harian 1 s/d {daysInMonth} sesuai sheet Implementation Support Excel Anda
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            type="button"
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors"
            title="Bulan Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
            <span>{MONTH_NAMES[month]}</span>
            <span>{year}</span>
          </div>

          <button
            type="button"
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors"
            title="Bulan Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              {/* Header Row 1: Day Numbers 1..31 */}
              <tr className="bg-neutral-900 text-white dark:bg-neutral-950 font-bold border-b border-neutral-800">
                <th className="py-2.5 px-3 sticky left-0 z-20 bg-neutral-900 text-white min-w-[200px] border-r border-neutral-800">
                  Property / Klien & Role
                </th>
                <th className="py-2 px-2 text-center text-[10px] w-12 border-r border-neutral-800">
                  Type
                </th>
                <th className="py-2 px-2 text-center text-[10px] w-12 border-r border-neutral-800">
                  WD
                </th>
                <th className="py-2 px-2 text-center text-[10px] w-12 border-r border-neutral-800">
                  WE
                </th>
                {daysArray.map((d) => (
                  <th
                    key={`d-${d.dayNum}`}
                    className={`py-2 px-1 text-center font-mono font-bold min-w-[32px] border-r border-neutral-800/60 ${
                      d.isWeekend
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'text-neutral-300'
                    }`}
                  >
                    {d.dayNum}
                  </th>
                ))}
              </tr>

              {/* Header Row 2: Day Names (Sat, Sun, Mon...) with pink weekend */}
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-[10px] font-bold">
                <th className="py-1.5 px-3 sticky left-0 z-20 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-r border-neutral-200 dark:border-neutral-700">
                  Hari dalam Seminggu
                </th>
                <th className="py-1.5 px-2 text-center bg-neutral-100 dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700">-</th>
                <th className="py-1.5 px-2 text-center bg-neutral-100 dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700">-</th>
                <th className="py-1.5 px-2 text-center bg-neutral-100 dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700">-</th>
                {daysArray.map((d) => (
                  <th
                    key={`dn-${d.dayNum}`}
                    className={`py-1.5 px-1 text-center font-mono border-r border-neutral-200 dark:border-neutral-800 ${
                      d.isWeekend
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-extrabold'
                        : 'bg-neutral-50 dark:bg-neutral-800/40 text-neutral-500'
                    }`}
                  >
                    {d.dayAbbr}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {activeItemsThisMonth.length === 0 ? (
                <tr>
                  <td colSpan={daysArray.length + 4} className="py-12 text-center text-neutral-400">
                    <CalendarIcon className="w-8 h-8 mx-auto opacity-30 mb-2" />
                    <p className="font-medium">Belum ada klaim kerja di bulan {MONTH_NAMES[month]} {year}.</p>
                    {onOpenNewWithDate && (
                      <button
                        type="button"
                        onClick={() => onOpenNewWithDate(`${year}-${String(month + 1).padStart(2, '0')}-01`)}
                        className="mt-3 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                      >
                        + Tambah Klaim Proyek Bulan Ini
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                activeItemsThisMonth.map((item) => {
                  return (
                    <tr 
                      key={item.id} 
                      className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30 transition-colors cursor-pointer group"
                      onClick={() => onEditItem && onEditItem(item)}
                    >
                      {/* Fixed Left Column: Property & Role */}
                      <td className="py-2.5 px-3 sticky left-0 z-10 bg-white dark:bg-neutral-900 group-hover:bg-neutral-50 dark:group-hover:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-800 shadow-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-bold text-neutral-900 dark:text-neutral-100 block truncate max-w-[150px]">
                              {item.property}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono block truncate">
                              #{item.no} · Rp {item.totalAmount.toLocaleString('id-ID')}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold text-white shrink-0 ${
                            item.role === 'M'
                              ? 'bg-emerald-500'
                              : item.role === 'TPM'
                              ? 'bg-indigo-600'
                              : 'bg-purple-600'
                          }`}>
                            {item.role}
                          </span>
                        </div>
                      </td>

                      {/* Type Column */}
                      <td className="py-2 px-1 text-center border-r border-neutral-200 dark:border-neutral-800 font-mono text-[10px]">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          item.typeProject === 'Onsite'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {item.typeProject}
                        </span>
                      </td>

                      {/* WD Count */}
                      <td className="py-2 px-1 text-center border-r border-neutral-200 dark:border-neutral-800 font-mono font-bold text-neutral-700 dark:text-neutral-300">
                        {item.wdDays}
                      </td>

                      {/* WE Count */}
                      <td className="py-2 px-1 text-center border-r border-neutral-200 dark:border-neutral-800 font-mono font-bold text-neutral-700 dark:text-neutral-300">
                        {item.weDays}
                      </td>

                      {/* Day Columns 1..31 */}
                      {daysArray.map((d) => {
                        const isActive = isItemActiveOnDate(item, d.dateStr);

                        return (
                          <td
                            key={`cell-${item.id}-${d.dayNum}`}
                            className={`py-2 px-0.5 text-center font-mono border-r border-neutral-100 dark:border-neutral-800/60 ${
                              d.isWeekend
                                ? isActive 
                                  ? 'bg-amber-200/80 dark:bg-amber-950/70' 
                                  : 'bg-rose-50/50 dark:bg-rose-950/20'
                                : isActive
                                ? 'bg-indigo-100 dark:bg-indigo-950/70'
                                : ''
                            }`}
                          >
                            {isActive ? (
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-bold text-[9px] shadow-2xs ${
                                d.isWeekend
                                  ? 'bg-amber-500 text-white'
                                  : item.role === 'M'
                                  ? 'bg-emerald-500 text-white'
                                  : item.role === 'TPM'
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-purple-600 text-white'
                              }`}>
                                {item.role}
                              </span>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend & Guide matching Excel style */}
      <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-neutral-700 dark:text-neutral-300">Legenda Jadwal:</span>
          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="w-3.5 h-3.5 rounded bg-rose-200 dark:bg-rose-950 border border-rose-300" />
            <span>Kolom Weekend (Sab/Min)</span>
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="w-3.5 h-3.5 rounded bg-emerald-500 text-white text-[9px] flex items-center justify-center font-bold">M</span>
            <span>Hari Kerja Role M</span>
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="w-3.5 h-3.5 rounded bg-indigo-600 text-white text-[9px] flex items-center justify-center font-bold">TPM</span>
            <span>Hari Kerja Role TPM</span>
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="w-3.5 h-3.5 rounded bg-purple-600 text-white text-[9px] flex items-center justify-center font-bold">PM</span>
            <span>Hari Kerja Role PM</span>
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="w-3.5 h-3.5 rounded bg-amber-500 text-white text-[9px] flex items-center justify-center font-bold">WE</span>
            <span>Hari Kerja di Weekend</span>
          </span>
        </div>

        <span className="text-[11px] text-neutral-500 italic">
          💡 Klik baris mana saja untuk melihat atau mengedit rincian klaim
        </span>
      </div>
    </div>
  );
};
