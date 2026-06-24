import type { Timestamp } from 'firebase/firestore';

export type Role = 'superAdmin' | 'callCenterAdmin' | 'viewer';
export type BreakStatus = 'good' | 'warning' | 'critical';
export type AuditAction =
  | 'login'
  | 'file_uploaded'
  | 'record_created'
  | 'record_updated'
  | 'record_bulk_updated'
  | 'record_deleted'
  | 'record_bulk_deleted'
  | 'record_restored'
  | 'record_bulk_restored'
  | 'user_created'
  | 'user_updated'
  | 'role_changed'
  | 'threshold_changed'
  | 'settings_updated'
  | 'manual_export';

export interface CallCenter {
  id: string;
  name: string;
  region?: string;
  active: boolean;
  createdAt?: Timestamp;
}

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  role: Role;
  callCenterId: string | null;
  callCenterName: string | null;
  active: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  createdBy?: string;
  lastLoginAt?: Timestamp;
  loginCount?: number;
}

export interface ThresholdSettings {
  goodMaxMinutes: number;
  warningMinMinutes: number;
  criticalMinMinutes: number;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

export interface ParsedBreakRecordInput {
  callCenterId: string;
  callCenterName: string;
  agentHpId: string;
  agentName: string;
  reportDate: string;
  reportStartDate: string;
  reportEndDate: string;
  reportDays: number;
  reportLabel: string;
  sheetName: string;
  reportType: 'summary' | 'tableauHourly';
  breakMinutes: number;
  status: BreakStatus;
  notes: string;
  exceptionReason: string;
  sourceFileName: string;
  hourlyBreaks?: Record<string, number>;
}

export interface BreakRecord extends ParsedBreakRecordInput {
  id: string;
  uploadId?: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt?: Timestamp;
  updatedBy?: string;
  updatedByName?: string;
  updatedAt?: Timestamp;
  deleted: boolean;
  deletedBy?: string;
  deletedByName?: string;
  deletedAt?: Timestamp;
}

export interface UploadBatch {
  id: string;
  callCenterId: string;
  callCenterName: string;
  fileName: string;
  filePath?: string;
  storageUrl?: string;
  reportDate: string;
  reportStartDate: string;
  reportEndDate: string;
  reportDays: number;
  totalRows: number;
  totalFlagged: number;
  totalCritical: number;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt?: Timestamp;
  parserMode: 'summary' | 'tableauHourly' | 'mixed';
}

export interface AuditLog {
  id: string;
  actionType: AuditAction;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: Role;
  callCenterId?: string | null;
  callCenterName?: string | null;
  createdAt?: Timestamp;
  previousValue?: unknown;
  newValue?: unknown;
  affectedRecordId?: string;
  fileName?: string;
  description?: string;
}

export interface AppVisit {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  callCenterId: string | null;
  callCenterName: string | null;
  createdAt?: Timestamp;
  userAgent: string;
  path: string;
}

export interface DashboardStats {
  totalUploadedReports: number;
  totalAgentsReviewed: number;
  totalAbove60: number;
  totalCritical: number;
  totalDeleted: number;
  totalVisits: number;
  uniqueUsers: number;
}

export interface RecordsFilters {
  callCenterId?: string;
  status?: BreakStatus | 'all';
  startDate?: string;
  endDate?: string;
  search?: string;
  includeDeleted?: boolean;
}
