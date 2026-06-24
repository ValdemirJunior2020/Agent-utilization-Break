import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { AuditAction, AppUser } from '../types';

interface AuditPayload {
  actionType: AuditAction;
  actor: AppUser;
  callCenterId?: string | null;
  callCenterName?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  affectedRecordId?: string;
  fileName?: string;
  description?: string;
}

export async function writeAuditLog(payload: AuditPayload) {
  await addDoc(collection(db, 'auditLogs'), {
    actionType: payload.actionType,
    userId: payload.actor.uid,
    userName: payload.actor.name,
    userEmail: payload.actor.email,
    userRole: payload.actor.role,
    callCenterId: payload.callCenterId ?? payload.actor.callCenterId ?? null,
    callCenterName: payload.callCenterName ?? payload.actor.callCenterName ?? null,
    previousValue: payload.previousValue ?? null,
    newValue: payload.newValue ?? null,
    affectedRecordId: payload.affectedRecordId ?? null,
    fileName: payload.fileName ?? null,
    description: payload.description ?? null,
    createdAt: serverTimestamp(),
  });
}
