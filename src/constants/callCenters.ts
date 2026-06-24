import type { CallCenter } from '../types';

export const CALL_CENTERS: CallCenter[] = [
  { id: 'wns', name: 'WNS', active: true },
  { id: 'teleperformance', name: 'Teleperformance', active: true },
  { id: 'buwelo-colombia', name: 'Buwelo Colombia', region: 'Colombia', active: true },
  { id: 'buwelo-ghana', name: 'Buwelo Ghana', region: 'Ghana', active: true },
  { id: 'concentrix', name: 'Concentrix', active: true },
  { id: 'telus', name: 'Telus', active: true },
];

export const DEFAULT_THRESHOLDS = {
  goodMaxMinutes: 60,
  warningMinMinutes: 60.01,
  criticalMinMinutes: 90,
};

export function getCallCenterName(callCenterId?: string | null) {
  return CALL_CENTERS.find((center) => center.id === callCenterId)?.name ?? 'All Call Centers';
}

export function inferCallCenterFromFileName(fileName: string) {
  const name = fileName.toLowerCase();
  if (name.includes('wns')) return CALL_CENTERS.find((c) => c.id === 'wns');
  if (name.includes('tep') || name.includes('teleperformance')) return CALL_CENTERS.find((c) => c.id === 'teleperformance');
  if (name.includes('telus')) return CALL_CENTERS.find((c) => c.id === 'telus');
  if (name.includes('concentrix')) return CALL_CENTERS.find((c) => c.id === 'concentrix');
  if (name.includes('ghana')) return CALL_CENTERS.find((c) => c.id === 'buwelo-ghana');
  if (name.includes('colombia')) return CALL_CENTERS.find((c) => c.id === 'buwelo-colombia');
  if (name.includes('buwelo')) return CALL_CENTERS.find((c) => c.id === 'buwelo-colombia');
  return undefined;
}
