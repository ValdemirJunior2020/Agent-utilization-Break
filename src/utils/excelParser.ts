import * as XLSX from 'xlsx';
import type { ParsedBreakRecordInput, ThresholdSettings } from '../types';
import { getBreakStatus } from './status';
import { normalizeReportPeriod, toISODate } from './dates';

interface ParseOptions {
  file: File;
  callCenterId: string;
  callCenterName: string;
  reportDate?: string;
  reportStartDate?: string;
  reportEndDate?: string;
  thresholds?: Partial<ThresholdSettings>;
}

export interface ParseResult {
  records: ParsedBreakRecordInput[];
  parserMode: 'summary' | 'tableauHourly' | 'mixed';
  sheetsProcessed: string[];
  warnings: string[];
}

type Row = unknown[];

function normalize(value: unknown) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const raw = value.trim();
    if (!raw) return 0;
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(raw)) {
      const parts = raw.split(':').map(Number);
      const h = parts[0] ?? 0;
      const m = parts[1] ?? 0;
      const s = parts[2] ?? 0;
      return h * 60 + m + s / 60;
    }
    const parsed = Number(raw.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function parseBreakCell(value: unknown): number {
  if (typeof value === 'number') {
    // Excel time values are fractions of a day. Processed reports also include raw minutes.
    if (value > 0 && value < 3) return value * 24 * 60;
    return value;
  }
  return toNumber(value);
}

function extractAgent(rawAgent: unknown) {
  const raw = String(rawAgent ?? '').trim();
  const hpMatch = raw.match(/hp\d{5,}/i);
  const hpId = hpMatch ? hpMatch[0].toLowerCase() : '';
  const name = hpId ? raw.replace(new RegExp(hpId, 'i'), '').replace(/[()\-–—]/g, ' ').trim() : raw;
  return {
    agentHpId: hpId || raw,
    agentName: name || (hpId ? '' : raw),
  };
}

function findHeaderRow(rows: Row[]) {
  for (let i = 0; i < Math.min(rows.length, 20); i += 1) {
    const normalized = rows[i].map(normalize);
    const agentIndex = normalized.findIndex((cell) => cell.includes('agent') || cell.includes('hp id') || cell.includes('name'));
    const breakMinutesIndex = normalized.findIndex(
      (cell) => cell.includes('grand total break') || (cell.includes('break') && cell.includes('minute')) || cell === 'break minutes',
    );
    const breakTimeIndex = normalized.findIndex((cell) => cell.includes('break time') || cell.includes('hours minutes'));
    if (agentIndex >= 0 && (breakMinutesIndex >= 0 || breakTimeIndex >= 0)) {
      const exceptionIndex = normalized.findIndex((cell) => cell.includes('exception') || cell.includes('reason'));
      const dateIndex = normalized.findIndex((cell) => cell.includes('date'));
      return { rowIndex: i, agentIndex, breakMinutesIndex, breakTimeIndex, exceptionIndex, dateIndex };
    }
  }
  return null;
}

function detectTableauHourly(rows: Row[]) {
  const firstRows = rows.slice(0, 5).map((row) => row.map(normalize).join(' ')).join(' ');
  return firstRows.includes('summary date') && rows.some((row) => normalize(row[2]).includes('break'));
}

function getReportLabel(sheetName: string) {
  const name = sheetName.toLowerCase();
  if (name.includes('7')) return '7-day report';
  if (name.includes('1')) return '1-day report';
  return sheetName;
}

function parseSummarySheet(
  rows: Row[],
  sheetName: string,
  options: ParseOptions,
): ParsedBreakRecordInput[] {
  const header = findHeaderRow(rows);
  if (!header) return [];
  const reportLabel = getReportLabel(sheetName);
  const fallbackDate = options.reportDate || options.reportEndDate || toISODate(rows[header.rowIndex + 1]?.[header.dateIndex], new Date());
  const period = normalizeReportPeriod(options.reportStartDate || fallbackDate, options.reportEndDate || options.reportDate || fallbackDate);
  const records: ParsedBreakRecordInput[] = [];

  for (let i = header.rowIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    const rawAgent = row[header.agentIndex];
    if (!rawAgent) continue;

    const breakMinutes =
      header.breakMinutesIndex >= 0
        ? parseBreakCell(row[header.breakMinutesIndex])
        : parseBreakCell(row[header.breakTimeIndex]);

    if (!Number.isFinite(breakMinutes) || breakMinutes <= 0) continue;

    const dateFromRow = header.dateIndex >= 0 ? row[header.dateIndex] : undefined;
    const rowDate = options.reportEndDate || options.reportDate || toISODate(dateFromRow, new Date(`${period.reportEndDate}T00:00:00`));
    const recordPeriod = normalizeReportPeriod(options.reportStartDate || rowDate, options.reportEndDate || rowDate);
    const { agentHpId, agentName } = extractAgent(rawAgent);
    const exceptionReason = header.exceptionIndex >= 0 ? String(row[header.exceptionIndex] ?? '').trim() : '';

    records.push({
      callCenterId: options.callCenterId,
      callCenterName: options.callCenterName,
      agentHpId,
      agentName,
      reportDate: recordPeriod.reportDate,
      reportStartDate: recordPeriod.reportStartDate,
      reportEndDate: recordPeriod.reportEndDate,
      reportDays: recordPeriod.reportDays,
      reportLabel,
      sheetName,
      reportType: 'summary',
      breakMinutes: Number(breakMinutes.toFixed(2)),
      status: getBreakStatus(breakMinutes, options.thresholds),
      notes: '',
      exceptionReason,
      sourceFileName: options.file.name,
    });
  }

  return records;
}

function parseTableauHourlySheet(
  rows: Row[],
  sheetName: string,
  options: ParseOptions,
): ParsedBreakRecordInput[] {
  const records: ParsedBreakRecordInput[] = [];
  const hourHeaderRow = rows[1] ?? [];
  const fallbackDate = options.reportDate || options.reportEndDate || toISODate(rows[2]?.[0], new Date());
  const period = normalizeReportPeriod(options.reportStartDate || fallbackDate, options.reportEndDate || options.reportDate || fallbackDate);

  for (let i = 2; i < rows.length; i += 1) {
    const row = rows[i];
    const metric = normalize(row[2]);
    if (!metric.includes('break')) continue;
    const rawAgent = row[1];
    if (!rawAgent) continue;

    const hourlyBreaks: Record<string, number> = {};
    let total = 0;

    for (let c = 3; c < row.length; c += 1) {
      const minutes = parseBreakCell(row[c]);
      if (!Number.isFinite(minutes) || minutes <= 0) continue;
      const hourLabel = String(hourHeaderRow[c] ?? `Column ${c + 1}`).trim();
      hourlyBreaks[hourLabel] = Number(minutes.toFixed(2));
      total += minutes;
    }

    if (total <= 0) continue;
    const { agentHpId, agentName } = extractAgent(rawAgent);

    records.push({
      callCenterId: options.callCenterId,
      callCenterName: options.callCenterName,
      agentHpId,
      agentName,
      reportDate: period.reportDate,
      reportStartDate: period.reportStartDate,
      reportEndDate: period.reportEndDate,
      reportDays: period.reportDays,
      reportLabel: 'Tableau hourly report',
      sheetName,
      reportType: 'tableauHourly',
      breakMinutes: Number(total.toFixed(2)),
      status: getBreakStatus(total, options.thresholds),
      notes: '',
      exceptionReason: '',
      sourceFileName: options.file.name,
      hourlyBreaks,
    });
  }

  return records;
}

export async function parseBreakExcel(options: ParseOptions): Promise<ParseResult> {
  const buffer = await options.file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const records: ParsedBreakRecordInput[] = [];
  const sheetsProcessed: string[] = [];
  const modes = new Set<'summary' | 'tableauHourly'>();
  const warnings: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Row>(sheet, { header: 1, raw: true, defval: null, blankrows: false });
    if (!rows.length) continue;

    let sheetRecords: ParsedBreakRecordInput[] = [];
    if (detectTableauHourly(rows)) {
      sheetRecords = parseTableauHourlySheet(rows, sheetName, options);
      modes.add('tableauHourly');
    } else {
      sheetRecords = parseSummarySheet(rows, sheetName, options);
      if (sheetRecords.length) modes.add('summary');
    }

    if (sheetRecords.length) {
      records.push(...sheetRecords);
      sheetsProcessed.push(sheetName);
    } else {
      warnings.push(`No break records detected on sheet: ${sheetName}`);
    }
  }

  const parserMode = modes.size > 1 ? 'mixed' : modes.has('tableauHourly') ? 'tableauHourly' : 'summary';
  return { records, parserMode, sheetsProcessed, warnings };
}
