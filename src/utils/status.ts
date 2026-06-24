import type { BreakStatus, ThresholdSettings } from '../types';
import { DEFAULT_THRESHOLDS } from '../constants/callCenters';

export function getBreakStatus(minutes: number, thresholds?: Partial<ThresholdSettings>): BreakStatus {
  const criticalMin = thresholds?.criticalMinMinutes ?? DEFAULT_THRESHOLDS.criticalMinMinutes;
  const goodMax = thresholds?.goodMaxMinutes ?? DEFAULT_THRESHOLDS.goodMaxMinutes;

  if (minutes >= criticalMin) return 'critical';
  if (minutes > goodMax) return 'warning';
  return 'good';
}

export function statusLabel(status: BreakStatus) {
  if (status === 'critical') return 'Critical';
  if (status === 'warning') return 'Warning';
  return 'Good';
}

export function statusClasses(status: BreakStatus) {
  if (status === 'critical') return 'bg-red-100 text-red-700 ring-red-200';
  if (status === 'warning') return 'bg-amber-100 text-amber-800 ring-amber-200';
  return 'bg-emerald-100 text-emerald-700 ring-emerald-200';
}
