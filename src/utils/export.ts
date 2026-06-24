import * as XLSX from 'xlsx';
import type { BreakRecord } from '../types';
import { formatDate, formatDateRange, formatDateTime } from './dates';
import type { YearlyImprovementSummary } from './improvementAnalytics';

export function exportRecordsToExcel(records: BreakRecord[], fileName = 'break-records.xlsx') {
  const rows = records.map((record) => ({
    'Call Center': record.callCenterName,
    'Agent HP ID': record.agentHpId,
    'Agent Name': record.agentName,
    'Report Period': formatDateRange(record.reportStartDate || record.reportDate, record.reportEndDate || record.reportDate),
    'Report Start Date': record.reportStartDate || record.reportDate,
    'Report End Date': record.reportEndDate || record.reportDate,
    'Report Date': record.reportDate,
    'Break Minutes': record.breakMinutes,
    Status: record.status,
    Notes: record.notes,
    'Exception Reason': record.exceptionReason,
    'Source File': record.sourceFileName,
    'Uploaded By': record.uploadedByName,
    'Uploaded At': formatDateTime(record.uploadedAt),
    Deleted: record.deleted ? 'Yes' : 'No',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Break Records');
  XLSX.writeFile(workbook, fileName);
}

export function exportRecordsToCsv(records: BreakRecord[], fileName = 'break-records.csv') {
  const rows = records.map((record) => ({
    callCenter: record.callCenterName,
    agentHpId: record.agentHpId,
    agentName: record.agentName,
    reportPeriod: formatDateRange(record.reportStartDate || record.reportDate, record.reportEndDate || record.reportDate),
    reportStartDate: record.reportStartDate || record.reportDate,
    reportEndDate: record.reportEndDate || record.reportDate,
    reportDate: record.reportDate,
    breakMinutes: record.breakMinutes,
    status: record.status,
    notes: record.notes,
    exceptionReason: record.exceptionReason,
    sourceFileName: record.sourceFileName,
    uploadedBy: record.uploadedByName,
    uploadedAt: formatDateTime(record.uploadedAt),
    deleted: record.deleted,
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}


export function exportYearlyImprovementToExcel(summary: YearlyImprovementSummary, fileName = `yearly-improvement-${summary.year}.xlsx`) {
  const rows = summary.months.map((month) => ({
    Month: month.label,
    'Report Month': month.month,
    'Agents Reviewed': month.reviewed,
    'Agents Above 60': month.above60,
    'Critical 90+': month.critical,
    'Issue Rate %': month.issueRate,
    'Critical Rate %': month.criticalRate,
    'Average Break Minutes': month.avgBreakMinutes,
    'Improvement vs Previous Month': month.improvementVsPrevious ?? '',
    'Improvement vs First Month': month.improvementVsFirst ?? '',
  }));

  const summaryRows = [
    { Metric: 'Year', Value: summary.year },
    { Metric: 'Total Agents Reviewed', Value: summary.totalReviewed },
    { Metric: 'Total Above 60 Minutes', Value: summary.totalAbove60 },
    { Metric: 'Total Critical 90+', Value: summary.totalCritical },
    { Metric: 'Annual Issue Rate %', Value: summary.annualIssueRate },
    { Metric: 'Annual Critical Rate %', Value: summary.annualCriticalRate },
    { Metric: 'Average Break Minutes', Value: summary.averageBreakMinutes },
    { Metric: 'First Month', Value: summary.firstMonth?.label ?? '' },
    { Metric: 'Latest Month', Value: summary.latestMonth?.label ?? '' },
    { Metric: 'Improvement First to Latest', Value: summary.improvementFromFirstToLatest ?? '' },
    { Metric: 'Best Month', Value: summary.bestMonth ? `${summary.bestMonth.label} (${summary.bestMonth.issueRate}%)` : '' },
    { Metric: 'Worst Month', Value: summary.worstMonth ? `${summary.worstMonth.label} (${summary.worstMonth.issueRate}%)` : '' },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Year Summary');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Monthly Improvement');
  XLSX.writeFile(workbook, fileName);
}

export function buildLeadershipSummary(records: BreakRecord[]) {
  const active = records.filter((record) => !record.deleted);
  const above60 = active.filter((record) => record.breakMinutes > 60);
  const critical = active.filter((record) => record.status === 'critical');
  const byCenter = above60.reduce<Record<string, number>>((acc, record) => {
    acc[record.callCenterName] = (acc[record.callCenterName] ?? 0) + 1;
    return acc;
  }, {});
  const lines = Object.entries(byCenter)
    .sort((a, b) => b[1] - a[1])
    .map(([center, count]) => `- ${center}: ${count} agents above 60 minutes`)
    .join('\n');

  return `Hi team,\n\nHere is the Agent Utilization and Break Time Compliance summary for ${formatDate(new Date())}:\n\nTotal agents reviewed: ${active.length}\nAgents above 60 minutes: ${above60.length}\nCritical agents at 90+ minutes: ${critical.length}\n\nBreak issue count by call center:\n${lines || '- No active break issues found.'}\n\nPlease review agents with valid exceptions and add the specific names and exception reasons in the system. We need measurable improvement in the next report.\n\nThank you.`;
}
