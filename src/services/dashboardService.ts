import { collection, getCountFromServer, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { AuditLog, BreakRecord, DashboardStats, UploadBatch } from '../types';

export async function getDashboardStats(callCenterId?: string | null): Promise<DashboardStats> {
  const centerConstraint = callCenterId ? [where('callCenterId', '==', callCenterId)] : [];

  const [uploads, records, above60, critical, deleted, visits, users] = await Promise.all([
    getCountFromServer(query(collection(db, 'uploads'), ...centerConstraint)),
    getCountFromServer(query(collection(db, 'breakRecords'), ...centerConstraint, where('deleted', '==', false))),
    getCountFromServer(query(collection(db, 'breakRecords'), ...centerConstraint, where('deleted', '==', false), where('status', 'in', ['warning', 'critical']))),
    getCountFromServer(query(collection(db, 'breakRecords'), ...centerConstraint, where('deleted', '==', false), where('status', '==', 'critical'))),
    getCountFromServer(query(collection(db, 'breakRecords'), ...centerConstraint, where('deleted', '==', true))),
    getCountFromServer(query(collection(db, 'appVisits'), ...(callCenterId ? [where('callCenterId', '==', callCenterId)] : []))),
    getCountFromServer(query(collection(db, 'users'), ...(callCenterId ? [where('callCenterId', '==', callCenterId)] : []))),
  ]);

  return {
    totalUploadedReports: uploads.data().count,
    totalAgentsReviewed: records.data().count,
    totalAbove60: above60.data().count,
    totalCritical: critical.data().count,
    totalDeleted: deleted.data().count,
    totalVisits: visits.data().count,
    uniqueUsers: users.data().count,
  };
}

export async function getDashboardRecords(callCenterId?: string | null) {
  const centerConstraint = callCenterId ? [where('callCenterId', '==', callCenterId)] : [];
  const [recordsSnap, uploadsSnap, logsSnap] = await Promise.all([
    getDocs(query(collection(db, 'breakRecords'), ...centerConstraint, where('deleted', '==', false), orderBy('reportDate', 'desc'), limit(5000))),
    getDocs(query(collection(db, 'uploads'), ...centerConstraint, orderBy('uploadedAt', 'desc'), limit(10))),
    getDocs(query(collection(db, 'auditLogs'), ...centerConstraint, orderBy('createdAt', 'desc'), limit(10))),
  ]);

  return {
    records: recordsSnap.docs.map((item) => ({ id: item.id, ...item.data() }) as BreakRecord),
    uploads: uploadsSnap.docs.map((item) => ({ id: item.id, ...item.data() }) as UploadBatch),
    auditLogs: logsSnap.docs.map((item) => ({ id: item.id, ...item.data() }) as AuditLog),
  };
}
