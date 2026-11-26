import type { ClosedPeriodRecord } from '../types';

export const DEFAULT_MONTHLY_CUTOFF_DAY = 26;

const SHORT_MONTHS_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

const LONG_MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function normalizeCutoffDay(day?: number | null): number {
  const n = Math.floor(Number(day));
  if (!Number.isFinite(n) || n < 1) return DEFAULT_MONTHLY_CUTOFF_DAY;
  if (n > 31) return 31;
  return n;
}

export function getLocalTodayYmd(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function getDaysInMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate();
}

export function formatYmd(year: number, month1to12: number, day: number): string {
  return `${year}-${String(month1to12).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseYm(ym: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(ym.trim());
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  if (!year || month < 1 || month > 12) return null;
  return { year, month };
}

export function addMonthsToYm(year: number, month1to12: number, delta: number): { year: number; month: number } {
  const total = year * 12 + (month1to12 - 1) + delta;
  const nextYear = Math.floor(total / 12);
  const nextMonth = (total % 12 + 12) % 12 + 1;
  return { year: nextYear, month: nextMonth };
}

export function getPeriodStartYmd(year: number, month1to12: number, cutoffDay: number): string {
  const safeCutoff = normalizeCutoffDay(cutoffDay);
  const effectiveDay = Math.min(safeCutoff, getDaysInMonth(year, month1to12));
  return formatYmd(year, month1to12, effectiveDay);
}

export interface BillingPeriodRange {
  key: string; // YYYY-MM (start month of the cycle)
  startDate: string; // YYYY-MM-DD inclusive
  endDate: string; // YYYY-MM-DD inclusive
  cutoffDay: number;
}

export function getPeriodRange(periodKey: string, cutoffDay?: number | null): BillingPeriodRange {
  const safeCutoff = normalizeCutoffDay(cutoffDay);
  const parsed = parseYm(periodKey);
  if (!parsed) {
    const today = new Date();
    const fallbackKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    return getPeriodRange(fallbackKey, safeCutoff);
  }

  const { year, month } = parsed;
  const startDate = getPeriodStartYmd(year, month, safeCutoff);
  const next = addMonthsToYm(year, month, 1);
  const nextStartDay = Math.min(safeCutoff, getDaysInMonth(next.year, next.month));
  const endUtc = new Date(Date.UTC(next.year, next.month - 1, nextStartDay - 1));
  const endDate = `${endUtc.getUTCFullYear()}-${String(endUtc.getUTCMonth() + 1).padStart(2, '0')}-${String(endUtc.getUTCDate()).padStart(2, '0')}`;

  return {
    key: `${year}-${String(month).padStart(2, '0')}`,
    startDate,
    endDate,
    cutoffDay: safeCutoff,
  };
}

export function getPeriodKeyForDate(dateStr: string, cutoffDay?: number | null): string {
  const safeCutoff = normalizeCutoffDay(cutoffDay);
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec((dateStr || '').trim());
  const ymd = match ? `${match[1]}-${match[2]}-${match[3]}` : getLocalTodayYmd();
  const year = parseInt(ymd.slice(0, 4), 10);
  const month = parseInt(ymd.slice(5, 7), 10);

  if (safeCutoff <= 1) {
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  const startThisMonth = getPeriodStartYmd(year, month, safeCutoff);
  if (ymd >= startThisMonth) {
    return `${year}-${String(month).padStart(2, '0')}`;
  }
  const prev = addMonthsToYm(year, month, -1);
  return `${prev.year}-${String(prev.month).padStart(2, '0')}`;
}

export function isDateInPeriod(dateStr: string, periodKey: string, cutoffDay?: number | null): boolean {
  if (!dateStr || dateStr.length < 10) return false;
  const ymd = dateStr.slice(0, 10);
  const { startDate, endDate } = getPeriodRange(periodKey, cutoffDay);
  return ymd >= startDate && ymd <= endDate;
}

export function formatShortDateId(ymd: string, includeYear = true): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return ymd;
  const year = parseInt(match[1], 10);
  const monthIdx = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  const monthName = SHORT_MONTHS_ID[monthIdx] || match[2];
  return includeYear ? `${day} ${monthName} ${year}` : `${day} ${monthName}`;
}

export function formatPeriodRangeText(periodKey: string, cutoffDay?: number | null): string {
  const { startDate, endDate, cutoffDay: safeCutoff } = getPeriodRange(periodKey, cutoffDay);
  if (safeCutoff <= 1) {
    const parsed = parseYm(periodKey);
    if (!parsed) return periodKey;
    return `${LONG_MONTHS_ID[parsed.month - 1]} ${parsed.year}`;
  }
  const sameYear = startDate.slice(0, 4) === endDate.slice(0, 4);
  return `${formatShortDateId(startDate, !sameYear)} – ${formatShortDateId(endDate, true)}`;
}

export function formatPeriodLabel(
  periodKey: string,
  cutoffDay?: number | null,
  currentPeriodKey?: string
): string {
  const safeCutoff = normalizeCutoffDay(cutoffDay);
  const baseLabel = formatPeriodRangeText(periodKey, safeCutoff);
  if (currentPeriodKey && periodKey === currentPeriodKey) {
    return safeCutoff <= 1 ? `${baseLabel} (Bulan Ini)` : `${baseLabel} (Periode Berjalan)`;
  }
  return baseLabel;
}

export function getPreviousPeriodKey(periodKey: string): string {
  const parsed = parseYm(periodKey);
  if (!parsed) return periodKey;
  const prev = addMonthsToYm(parsed.year, parsed.month, -1);
  return `${prev.year}-${String(prev.month).padStart(2, '0')}`;
}

export function getFiscalYearRange(yearKey: string): {
  key: string;
  startDate: string;
  endDate: string;
  label: string;
} {
  const cleanYear = /^\d{4}$/.test(yearKey.trim())
    ? yearKey.trim()
    : getLocalTodayYmd().slice(0, 4);
  return {
    key: cleanYear,
    startDate: `${cleanYear}-01-01`,
    endDate: `${cleanYear}-12-31`,
    label: `Tahun Fiskal ${cleanYear} (1 Jan – 31 Des ${cleanYear})`,
  };
}

export function findClosedPeriodForDate(
  dateStr: string,
  closedPeriods: ClosedPeriodRecord[]
): ClosedPeriodRecord | undefined {
  if (!dateStr || dateStr.length < 10 || !Array.isArray(closedPeriods) || closedPeriods.length === 0) {
    return undefined;
  }
  const ymd = dateStr.slice(0, 10);
  return closedPeriods.find((cp) => ymd >= cp.startDate && ymd <= cp.endDate);
}
