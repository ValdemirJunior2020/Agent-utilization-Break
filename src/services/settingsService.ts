import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { DEFAULT_THRESHOLDS } from '../constants/callCenters';
import type { AppUser, ThresholdSettings } from '../types';
import { writeAuditLog } from './auditService';

const SETTINGS_DOC = 'thresholds';

export async function getThresholdSettings(): Promise<ThresholdSettings> {
  const ref = doc(db, 'settings', SETTINGS_DOC);
  const snap = await getDoc(ref);
  if (!snap.exists()) return DEFAULT_THRESHOLDS;
  return { ...DEFAULT_THRESHOLDS, ...snap.data() } as ThresholdSettings;
}

export async function saveThresholdSettings(settings: ThresholdSettings, actor: AppUser) {
  const previous = await getThresholdSettings();
  await setDoc(
    doc(db, 'settings', SETTINGS_DOC),
    {
      ...settings,
      updatedAt: serverTimestamp(),
      updatedBy: actor.uid,
    },
    { merge: true },
  );
  await writeAuditLog({
    actionType: 'threshold_changed',
    actor,
    previousValue: previous,
    newValue: settings,
    description: 'Break-time thresholds changed.',
  });
}
