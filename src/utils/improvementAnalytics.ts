import type { BreakRecord } from '../types';

export interface MonthlyImprovementMetric {
  month: string;
  label: string;
  reviewed: number;
  above60: number;
  critical: number;
  avgBreakMinutes: number;
  issueRate: number;
  criticalRate: number;
  improvementVsPrevious: number | null;
  improvementVsFirst: number | null;
}

export interface YearlyImprovementSummary {
  year: number;
  months: MonthlyImprovementMetric[];
  totalReviewed: number;
  totalAbove60: number;
  totalCritical: number;
  annualIssueRate: number;
  annualCriticalRate: number;
  averageBreakMinutes: number;
  firstMonth?: MonthlyImprovementMetric;
  latestMonth?: MonthlyImprovementMetric;
  bestMonth?: MonthlyImprovementMetric;
  worstMonth?: MonthlyImprovementMetric;
  improvementFromFirstToLatest: number | null;
  monthsImproved: number;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function round(value: number, decimals = 1) {
  return Number(value.toFixed(decimals));
}

function percentage(part: number, total: number) {
  if (!total) return 0;
  return round((part / total) * 100, 1);
}

export function getAvailableYears(records: BreakRecord[]) {
  const years = new Set<number>();
  records.forEach((record) => {
    const year = Number(record.reportDate?.slice(0, 4));
    if (year) years.add(year);
  });
  years.add(new Date().getFullYear());
  return Array.from(years).sort((a, b) => b - a);
}

export function buildYearlyImprovement(records: BreakRecord[], year = new Date().getFullYear()): YearlyImprovementSummary {
  const active = records.filter((record) => !record.deleted && record.reportDate?.startsWith(String(year)));
  const buckets = Array.from({ length: 12 }, (_, index) => ({
    month: `${year}-${String(index + 1).padStart(2, '0')}`,
    label: MONTH_LABELS[index],
    reviewed: 0,
    above60: 0,
    critical: 0,
    totalBreakMinutes: 0,
  }));

  active.forEach((record) => {
    const monthIndex = Number(record.reportDate.slice(5, 7)) - 1;
    if (monthIndex < 0 || monthIndex > 11) return;
    const bucket = buckets[monthIndex];
    bucket.reviewed += 1;
    bucket.totalBreakMinutes += Number(record.breakMinutes || 0);
    if (record.breakMinutes > 60) bucket.above60 += 1;
    if (record.status === 'critical') bucket.critical += 1;
  });

  let firstIssueRate: number | null = null;
  let previousIssueRate: number | null = null;
  const months: MonthlyImprovementMetric[] = buckets.map((bucket) => {
    const issueRate = percentage(bucket.above60, bucket.reviewed);
    const criticalRate = percentage(bucket.critical, bucket.reviewed);
    const avgBreakMinutes = bucket.reviewed ? round(bucket.totalBreakMinutes / bucket.reviewed, 1) : 0;
    const improvementVsPrevious = previousIssueRate === null || bucket.reviewed === 0 ? null : round(previousIssueRate - issueRate, 1);

    if (bucket.reviewed > 0 && firstIssueRate === null) firstIssueRate = issueRate;
    const improvementVsFirst = firstIssueRate === null || bucket.reviewed === 0 ? null : round(firstIssueRate - issueRate, 1);
    if (bucket.reviewed > 0) previousIssueRate = issueRate;

    return {
      month: bucket.month,
      label: bucket.label,
      reviewed: bucket.reviewed,
      above60: bucket.above60,
      critical: bucket.critical,
      avgBreakMinutes,
      issueRate,
      criticalRate,
      improvementVsPrevious,
      improvementVsFirst,
    };
  });

  const monthsWithData = months.filter((month) => month.reviewed > 0);
  const totalReviewed = active.length;
  const totalAbove60 = active.filter((record) => record.breakMinutes > 60).length;
  const totalCritical = active.filter((record) => record.status === 'critical').length;
  const averageBreakMinutes = totalReviewed ? round(active.reduce((sum, record) => sum + Number(record.breakMinutes || 0), 0) / totalReviewed, 1) : 0;
  const firstMonth = monthsWithData[0];
  const latestMonth = monthsWithData.at(-1);
  const bestMonth = monthsWithData.length ? [...monthsWithData].sort((a, b) => a.issueRate - b.issueRate || b.reviewed - a.reviewed)[0] : undefined;
  const worstMonth = monthsWithData.length ? [...monthsWithData].sort((a, b) => b.issueRate - a.issueRate || b.reviewed - a.reviewed)[0] : undefined;
  const improvementFromFirstToLatest = firstMonth && latestMonth ? round(firstMonth.issueRate - latestMonth.issueRate, 1) : null;
  const monthsImproved = monthsWithData.filter((month) => (month.improvementVsPrevious ?? 0) > 0).length;

  return {
    year,
    months,
    totalReviewed,
    totalAbove60,
    totalCritical,
    annualIssueRate: percentage(totalAbove60, totalReviewed),
    annualCriticalRate: percentage(totalCritical, totalReviewed),
    averageBreakMinutes,
    firstMonth,
    latestMonth,
    bestMonth,
    worstMonth,
    improvementFromFirstToLatest,
    monthsImproved,
  };
}

export function formatPercentagePointChange(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  if (value > 0) return `+${value.toFixed(1)} pts better`;
  if (value < 0) return `${Math.abs(value).toFixed(1)} pts worse`;
  return 'No change';
}
