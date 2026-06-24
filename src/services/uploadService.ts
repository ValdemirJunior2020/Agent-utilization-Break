import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { AppUser, ParsedBreakRecordInput, UploadBatch } from '../types';
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
  onProgress?: (progress: number) => void;
}

/**
 * The Excel file is parsed in the browser and the extracted records are saved to Firestore.
 *
 * Earlier versions also tried to upload the raw workbook to Firebase Storage. That created a
 * bucket/CORS dependency during local testing. This app does not need Storage to process reports,
 * so the default behavior is Firestore-only. The upload metadata still keeps a logical filePath
 * and the source file name for audit/history.
 */
export async function uploadAndProcessExcel(options: UploadOptions) {
  options.onProgress?.(10);
  const thresholds = await getThresholdSettings();
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
  });

  options.onProgress?.(70);
  await createRecordsFromUpload(parseResult.records, uploadDoc.id, options.actor);
  options.onProgress?.(90);

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
    },
    description: 'Excel report uploaded and processed.',
  });

  options.onProgress?.(100);
  return { uploadId: uploadDoc.id, ...parseResult, totalFlagged, totalCritical };
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
