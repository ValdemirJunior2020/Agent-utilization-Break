import {
  addDoc,
  collection,
  doc,
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
import type { AppUser, BreakRecord, ParsedBreakRecordInput, UploadBatch } from '../types';
import { parseBreakExcel } from '../utils/excelParser';
import { createRecordsFromUpload } from './recordsService';
import { writeAuditLog } from './auditService';
import { getThresholdSettings } from './settingsService';

interface UploadOptions {
  file: File;
  callCenterId: string;
  callCenterName: string;
  reportDate: string;
  reportStartDate: string;
  reportEndDate: string;
  actor: AppUser;
  /**
   * When true, active records/uploads from the same call center with overlapping
   * date ranges are soft-deleted/superseded before the new upload becomes active.
   * This prevents duplicated dashboard counts when a 30-day report includes a
   * previously uploaded 7-day or 1-day report.
   */
  replaceOverlappingDates?: boolean;
  onProgress?: (progress: number) => void;
}

interface SupersedeResult {
  supersededRecordCount: number;
  supersededUploadCount: number;
  supersededUploadIds: string[];
}

function dateRangesOverlap(oldStart: string, oldEnd: string, newStart: string, newEnd: string) {
  return oldStart <= newEnd && newStart <= oldEnd;
}

function chunkItems<T>(items: T[], size = 450) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function normalizeUploadDateRange(upload: Partial<UploadBatch>) {
  const start = upload.reportStartDate || upload.reportDate || '';
  const end = upload.reportEndDate || upload.reportDate || start;
  return { start, end };
}

async function getActiveOverlappingUploads(
  callCenterId: string,
  reportStartDate: string,
  reportEndDate: string,
) {
  // Intentionally only query by callCenterId to avoid requiring another composite index.
  // The date overlap and status checks are done in memory.
  const snap = await getDocs(query(collection(db, 'uploads'), where('callCenterId', '==', callCenterId)));

  return snap.docs
    .map((item) => ({ id: item.id, ...item.data() }) as UploadBatch)
    .filter((upload) => upload.status !== 'superseded')
    .filter((upload) => {
      const { start, end } = normalizeUploadDateRange(upload);
      return Boolean(start && end && dateRangesOverlap(start, end, reportStartDate, reportEndDate));
    });
}

async function getActiveOverlappingRecords(
  callCenterId: string,
  reportStartDate: string,
  reportEndDate: string,
) {
  // Intentionally only query by callCenterId to avoid requiring a composite index.
  // Deleted/date overlap checks are done in memory because records can contain ranges.
  const snap = await getDocs(query(collection(db, 'breakRecords'), where('callCenterId', '==', callCenterId)));

  return snap.docs
    .map((item) => ({ id: item.id, ...item.data() }) as BreakRecord)
    .filter((record) => record.deleted !== true)
    .filter((record) => {
      const start = record.reportStartDate || record.reportDate;
      const end = record.reportEndDate || record.reportDate;
      return Boolean(start && end && dateRangesOverlap(start, end, reportStartDate, reportEndDate));
    });
}

async function supersedeOverlappingData(options: {
  callCenterId: string;
  callCenterName: string;
  reportStartDate: string;
  reportEndDate: string;
  newUploadId: string;
  actor: AppUser;
}) : Promise<SupersedeResult> {
  const [overlappingUploads, overlappingRecords] = await Promise.all([
    getActiveOverlappingUploads(options.callCenterId, options.reportStartDate, options.reportEndDate),
    getActiveOverlappingRecords(options.callCenterId, options.reportStartDate, options.reportEndDate),
  ]);

  const recordUpdate = {
    deleted: true,
    deleteReason: 'Superseded by newer overlapping upload',
    superseded: true,
    supersededByUploadId: options.newUploadId,
    supersededAt: serverTimestamp(),
    deletedBy: options.actor.uid,
    deletedByName: options.actor.name,
    deletedAt: serverTimestamp(),
    updatedBy: options.actor.uid,
    updatedByName: options.actor.name,
    updatedAt: serverTimestamp(),
  };

  const uploadUpdate = {
    status: 'superseded',
    superseded: true,
    supersededByUploadId: options.newUploadId,
    supersededAt: serverTimestamp(),
    updatedBy: options.actor.uid,
    updatedByName: options.actor.name,
    updatedAt: serverTimestamp(),
  };

  for (const chunk of chunkItems(overlappingRecords)) {
    const batch = writeBatch(db);
    chunk.forEach((record) => batch.update(doc(db, 'breakRecords', record.id), recordUpdate));
    await batch.commit();
  }

  for (const chunk of chunkItems(overlappingUploads)) {
    const batch = writeBatch(db);
    chunk.forEach((upload) => batch.update(doc(db, 'uploads', upload.id), uploadUpdate));
    await batch.commit();
  }

  if (overlappingRecords.length || overlappingUploads.length) {
    await writeAuditLog({
      actionType: 'upload_superseded',
      actor: options.actor,
      callCenterId: options.callCenterId,
      callCenterName: options.callCenterName,
      affectedRecordId: options.newUploadId,
      previousValue: {
        supersededUploadIds: overlappingUploads.map((upload) => upload.id),
        supersededRecordIds: overlappingRecords.map((record) => record.id),
      },
      newValue: {
        newUploadId: options.newUploadId,
        reportStartDate: options.reportStartDate,
        reportEndDate: options.reportEndDate,
        supersededUploadCount: overlappingUploads.length,
        supersededRecordCount: overlappingRecords.length,
      },
      description: `Superseded ${overlappingRecords.length} active record(s) and ${overlappingUploads.length} previous upload(s) because the new report overlaps the same call center date range.`,
    });
  }

  return {
    supersededRecordCount: overlappingRecords.length,
    supersededUploadCount: overlappingUploads.length,
    supersededUploadIds: overlappingUploads.map((upload) => upload.id),
  };
}

/**
 * The Excel file is parsed in the browser and the extracted records are saved to Firestore.
 *
 * Storage is intentionally not required. The app keeps metadata about the file name/path but
 * writes parsed break records directly to Firestore.
 */
export async function uploadAndProcessExcel(options: UploadOptions) {
  options.onProgress?.(10);
  const thresholds = await getThresholdSettings();
  const replaceOverlappingDates = options.replaceOverlappingDates ?? true;

  const parseResult = await parseBreakExcel({
    file: options.file,
    callCenterId: options.callCenterId,
    callCenterName: options.callCenterName,
    reportDate: options.reportDate,
    reportStartDate: options.reportStartDate,
    reportEndDate: options.reportEndDate,
    thresholds,
  });

  if (!parseResult.records.length) {
    throw new Error('No valid break records were detected in this Excel file. Check that the file contains agent and break-time columns.');
  }

  options.onProgress?.(45);
  const path = `uploads/${options.callCenterId}/${Date.now()}-${options.file.name}`;
  const totalFlagged = parseResult.records.filter((record) => record.breakMinutes > thresholds.goodMaxMinutes).length;
  const totalCritical = parseResult.records.filter((record) => record.breakMinutes >= thresholds.criticalMinMinutes).length;

  const uploadDoc = await addDoc(collection(db, 'uploads'), {
    callCenterId: options.callCenterId,
    callCenterName: options.callCenterName,
    fileName: options.file.name,
    filePath: path,
    storageUrl: null,
    storageUploadEnabled: false,
    reportDate: options.reportDate,
    reportStartDate: options.reportStartDate,
    reportEndDate: options.reportEndDate,
    reportDays: parseResult.records[0]?.reportDays ?? 1,
    totalRows: parseResult.records.length,
    totalFlagged,
    totalCritical,
    uploadedBy: options.actor.uid,
    uploadedByName: options.actor.name,
    uploadedAt: serverTimestamp(),
    parserMode: parseResult.parserMode,
    sheetsProcessed: parseResult.sheetsProcessed,
    parserWarnings: parseResult.warnings,
    status: 'active',
    superseded: false,
    supersededByUploadId: null,
    supersededAt: null,
    replaceOverlappingDates,
  });

  options.onProgress?.(60);
  const supersedeResult = replaceOverlappingDates
    ? await supersedeOverlappingData({
        callCenterId: options.callCenterId,
        callCenterName: options.callCenterName,
        reportStartDate: options.reportStartDate,
        reportEndDate: options.reportEndDate,
        newUploadId: uploadDoc.id,
        actor: options.actor,
      })
    : { supersededRecordCount: 0, supersededUploadCount: 0, supersededUploadIds: [] };

  options.onProgress?.(75);
  await createRecordsFromUpload(parseResult.records, uploadDoc.id, options.actor);
  options.onProgress?.(90);

  await updateDoc(doc(db, 'uploads', uploadDoc.id), {
    supersededPreviousRecordCount: supersedeResult.supersededRecordCount,
    supersededPreviousUploadCount: supersedeResult.supersededUploadCount,
    supersededPreviousUploadIds: supersedeResult.supersededUploadIds,
  });

  await writeAuditLog({
    actionType: 'file_uploaded',
    actor: options.actor,
    callCenterId: options.callCenterId,
    callCenterName: options.callCenterName,
    fileName: options.file.name,
    affectedRecordId: uploadDoc.id,
    newValue: {
      recordsCreated: parseResult.records.length,
      totalFlagged,
      totalCritical,
      parserMode: parseResult.parserMode,
      reportStartDate: options.reportStartDate,
      reportEndDate: options.reportEndDate,
      sheetsProcessed: parseResult.sheetsProcessed,
      replaceOverlappingDates,
      supersededPreviousRecordCount: supersedeResult.supersededRecordCount,
      supersededPreviousUploadCount: supersedeResult.supersededUploadCount,
      supersededPreviousUploadIds: supersedeResult.supersededUploadIds,
    },
    description: 'Excel report uploaded and processed.',
  });

  options.onProgress?.(100);
  return { uploadId: uploadDoc.id, ...parseResult, totalFlagged, totalCritical, ...supersedeResult };
}

export async function getRecentUploads(maxUploads = 15): Promise<UploadBatch[]> {
  const snap = await getDocs(query(collection(db, 'uploads'), orderBy('uploadedAt', 'desc'), limit(maxUploads)));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }) as UploadBatch);
}

export function summarizeParsedRecords(records: ParsedBreakRecordInput[]) {
  return {
    total: records.length,
    above60: records.filter((record) => record.breakMinutes > 60).length,
    critical: records.filter((record) => record.breakMinutes >= 90).length,
  };
}
