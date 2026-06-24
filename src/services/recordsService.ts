import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { AppUser, BreakRecord, ParsedBreakRecordInput, RecordsFilters } from '../types';
import { writeAuditLog } from './auditService';
import { getBreakStatus } from '../utils/status';
import { getThresholdSettings } from './settingsService';

function cleanUndefined<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(Object.entries(input).map(([k, v]) => [k, v === undefined ? null : v])) as T;
}

export async function getBreakRecords(filters: RecordsFilters = {}, maxRecords = 500): Promise<BreakRecord[]> {
  const constraints = [];

  if (filters.callCenterId) constraints.push(where('callCenterId', '==', filters.callCenterId));
  if (!filters.includeDeleted) constraints.push(where('deleted', '==', false));
  if (filters.status && filters.status !== 'all') constraints.push(where('status', '==', filters.status));
  if (filters.startDate) constraints.push(where('reportDate', '>=', filters.startDate));
  if (filters.endDate) constraints.push(where('reportDate', '<=', filters.endDate));

  const q = query(collection(db, 'breakRecords'), ...constraints, orderBy('reportDate', 'desc'), limit(maxRecords));
  const snap = await getDocs(q);
  let records = snap.docs.map((item) => ({ id: item.id, ...item.data() }) as BreakRecord);

  const search = filters.search?.trim().toLowerCase();
  if (search) {
    records = records.filter(
      (record) =>
        record.agentHpId.toLowerCase().includes(search) ||
        record.agentName.toLowerCase().includes(search) ||
        record.callCenterName.toLowerCase().includes(search),
    );
  }

  return records;
}

export async function getRecord(recordId: string) {
  const snap = await getDoc(doc(db, 'breakRecords', recordId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as BreakRecord;
}

export async function addManualRecord(input: ParsedBreakRecordInput, actor: AppUser) {
  const docRef = await addDoc(
    collection(db, 'breakRecords'),
    cleanUndefined({
      ...input,
      uploadedBy: actor.uid,
      uploadedByName: actor.name,
      uploadedAt: serverTimestamp(),
      deleted: false,
    }),
  );
  await writeAuditLog({
    actionType: 'record_created',
    actor,
    callCenterId: input.callCenterId,
    callCenterName: input.callCenterName,
    affectedRecordId: docRef.id,
    newValue: input,
    description: 'Manual break record created.',
  });
  return docRef.id;
}

export async function updateBreakRecord(recordId: string, updates: Partial<BreakRecord>, actor: AppUser) {
  const previous = await getRecord(recordId);
  const thresholds = await getThresholdSettings();
  const breakMinutes = typeof updates.breakMinutes === 'number' ? updates.breakMinutes : previous?.breakMinutes ?? 0;
  const next = cleanUndefined({
    ...updates,
    status: typeof updates.breakMinutes === 'number' ? getBreakStatus(breakMinutes, thresholds) : updates.status ?? previous?.status,
    updatedBy: actor.uid,
    updatedByName: actor.name,
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'breakRecords', recordId), next);
  await writeAuditLog({
    actionType: 'record_updated',
    actor,
    callCenterId: previous?.callCenterId,
    callCenterName: previous?.callCenterName,
    affectedRecordId: recordId,
    previousValue: previous,
    newValue: updates,
    description: 'Break record updated.',
  });
}

export async function softDeleteRecord(record: BreakRecord, actor: AppUser) {
  await updateDoc(doc(db, 'breakRecords', record.id), {
    deleted: true,
    deletedBy: actor.uid,
    deletedByName: actor.name,
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: actor.uid,
    updatedByName: actor.name,
  });
  await writeAuditLog({
    actionType: 'record_deleted',
    actor,
    callCenterId: record.callCenterId,
    callCenterName: record.callCenterName,
    affectedRecordId: record.id,
    previousValue: record,
    description: 'Break record soft deleted.',
  });
}

export async function restoreRecord(record: BreakRecord, actor: AppUser) {
  await updateDoc(doc(db, 'breakRecords', record.id), {
    deleted: false,
    deletedBy: null,
    deletedByName: null,
    deletedAt: null,
    deleteReason: null,
    superseded: false,
    supersededByUploadId: null,
    supersededAt: null,
    updatedAt: serverTimestamp(),
    updatedBy: actor.uid,
    updatedByName: actor.name,
  });
  await writeAuditLog({
    actionType: 'record_restored',
    actor,
    callCenterId: record.callCenterId,
    callCenterName: record.callCenterName,
    affectedRecordId: record.id,
    previousValue: record,
    description: 'Break record restored.',
  });
}

export interface BulkRecordUpdates {
  status?: BreakRecord['status'];
  notes?: string;
  exceptionReason?: string;
  reportDate?: string;
  reportStartDate?: string;
  reportEndDate?: string;
  reportDays?: number;
  callCenterId?: string;
  callCenterName?: string;
}

function chunkRecords<T>(items: T[], size = 450) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

export async function bulkUpdateRecords(records: BreakRecord[], updates: BulkRecordUpdates, actor: AppUser) {
  if (!records.length) return;
  const cleanUpdates = cleanUndefined({
    ...updates,
    updatedBy: actor.uid,
    updatedByName: actor.name,
    updatedAt: serverTimestamp(),
  });

  for (const chunk of chunkRecords(records)) {
    const batch = writeBatch(db);
    chunk.forEach((record) => batch.update(doc(db, 'breakRecords', record.id), cleanUpdates));
    await batch.commit();
  }

  await writeAuditLog({
    actionType: 'record_bulk_updated',
    actor,
    callCenterId: actor.role === 'superAdmin' ? null : actor.callCenterId,
    callCenterName: actor.role === 'superAdmin' ? 'Multiple / Super Admin' : actor.callCenterName,
    previousValue: records.map((record) => ({ id: record.id, status: record.status, notes: record.notes, exceptionReason: record.exceptionReason, reportDate: record.reportDate, callCenterId: record.callCenterId })),
    newValue: { updates, affectedRecordIds: records.map((record) => record.id), count: records.length },
    description: `Bulk updated ${records.length} break record${records.length === 1 ? '' : 's'}.`,
  });
}

export async function bulkSoftDeleteRecords(records: BreakRecord[], actor: AppUser) {
  if (!records.length) return;
  const updates = {
    deleted: true,
    deletedBy: actor.uid,
    deletedByName: actor.name,
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: actor.uid,
    updatedByName: actor.name,
  };

  for (const chunk of chunkRecords(records)) {
    const batch = writeBatch(db);
    chunk.forEach((record) => batch.update(doc(db, 'breakRecords', record.id), updates));
    await batch.commit();
  }

  await writeAuditLog({
    actionType: 'record_bulk_deleted',
    actor,
    callCenterId: actor.role === 'superAdmin' ? null : actor.callCenterId,
    callCenterName: actor.role === 'superAdmin' ? 'Multiple / Super Admin' : actor.callCenterName,
    previousValue: records.map((record) => ({ id: record.id, deleted: record.deleted, agentHpId: record.agentHpId, reportDate: record.reportDate })),
    newValue: { deleted: true, affectedRecordIds: records.map((record) => record.id), count: records.length },
    description: `Bulk soft deleted ${records.length} break record${records.length === 1 ? '' : 's'}.`,
  });
}

export async function bulkRestoreRecords(records: BreakRecord[], actor: AppUser) {
  if (!records.length) return;
  const updates = {
    deleted: false,
    deletedBy: null,
    deletedByName: null,
    deletedAt: null,
    deleteReason: null,
    superseded: false,
    supersededByUploadId: null,
    supersededAt: null,
    updatedAt: serverTimestamp(),
    updatedBy: actor.uid,
    updatedByName: actor.name,
  };

  for (const chunk of chunkRecords(records)) {
    const batch = writeBatch(db);
    chunk.forEach((record) => batch.update(doc(db, 'breakRecords', record.id), updates));
    await batch.commit();
  }

  await writeAuditLog({
    actionType: 'record_bulk_restored',
    actor,
    callCenterId: actor.role === 'superAdmin' ? null : actor.callCenterId,
    callCenterName: actor.role === 'superAdmin' ? 'Multiple / Super Admin' : actor.callCenterName,
    previousValue: records.map((record) => ({ id: record.id, deleted: record.deleted, agentHpId: record.agentHpId, reportDate: record.reportDate })),
    newValue: { deleted: false, affectedRecordIds: records.map((record) => record.id), count: records.length },
    description: `Bulk restored ${records.length} break record${records.length === 1 ? '' : 's'}.`,
  });
}

export async function createRecordsFromUpload(
  records: ParsedBreakRecordInput[],
  uploadId: string,
  actor: AppUser,
) {
  const chunks: ParsedBreakRecordInput[][] = [];
  for (let i = 0; i < records.length; i += 450) chunks.push(records.slice(i, i + 450));

  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach((record) => {
      const ref = doc(collection(db, 'breakRecords'));
      batch.set(
        ref,
        cleanUndefined({
          ...record,
          uploadId,
          uploadedBy: actor.uid,
          uploadedByName: actor.name,
          uploadedAt: serverTimestamp(),
          deleted: false,
        }),
      );
    });
    await batch.commit();
  }
}
