import type { Timestamp } from 'firebase/firestore';

export function toISODate(input: unknown, fallback = new Date()): string {
  if (input instanceof Date && !Number.isNaN(input.getTime())) return input.toISOString().slice(0, 10);
  if (typeof input === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + input * 86400000);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }
  if (typeof input === 'string' && input.trim()) {
    const cleaned = input.trim();
    const parsed = new Date(cleaned);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    const ymd = cleaned.match(/(20\d{2})[-/](\d{1,2})[-/](\d{1,2})/);
    if (ymd) {
      const [, y, m, d] = ymd;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    const mdy = cleaned.match(/(\d{1,2})[-/](\d{1,2})[-/](20\d{2})/);
    if (mdy) {
      const [, m, d, y] = mdy;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  return fallback.toISOString().slice(0, 10);
}

export function formatDate(value?: Timestamp | string | Date | null) {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : value instanceof Date ? value : value.toDate();
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(date);
}

export function formatShortDate(value?: string | Date | null) {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).format(date);
}

export function formatDateRange(start?: string | null, end?: string | null) {
  if (!start && !end) return '—';
  if (!start || !end || start === end) return formatDate(start || end);
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}

export function formatDateTime(value?: Timestamp | string | Date | null) {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value instanceof Date ? value : value.toDate();
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysAgoISO(days: number) {
  return addDaysISO(todayISO(), -days);
}

export function reportPeriodDays(startDate?: string | null, endDate?: string | null) {
  if (!startDate || !endDate) return 1;
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T00:00:00`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 1;
  if (start === end) return 1;
  return Math.max(1, Math.round((end - start) / 86400000));
}

export function normalizeReportPeriod(startDate?: string | null, endDate?: string | null) {
  const fallback = todayISO();
  const start = startDate || endDate || fallback;
  const end = endDate || startDate || fallback;
  if (start > end) return { reportStartDate: end, reportEndDate: start, reportDate: start, reportDays: reportPeriodDays(end, start) };
  return { reportStartDate: start, reportEndDate: end, reportDate: end, reportDays: reportPeriodDays(start, end) };
}
