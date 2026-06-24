import { useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { AuditLog } from '../types';
import { useAuthStore, isSuperAdmin } from '../store/authStore';
import { PageHeader } from '../components/layout/PageHeader';
import { formatDateTime } from '../utils/dates';
import { SoftBadge } from '../components/ui/Badge';

export function AuditHistoryPage() {
  const profile = useAuthStore((state) => state.profile)!;
  const superAdmin = isSuperAdmin(profile);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    const constraints = superAdmin ? [] : [where('callCenterId', '==', profile.callCenterId)];
    getDocs(query(collection(db, 'auditLogs'), ...constraints, orderBy('createdAt', 'desc'), limit(250))).then((snap) => {
      setLogs(snap.docs.map((item) => ({ id: item.id, ...item.data() }) as AuditLog));
    });
  }, [profile.callCenterId, superAdmin]);

  return (
    <div>
      <PageHeader title="Audit History" description="Every login, upload, record change, deletion, restore, role change, and threshold change is logged with user, role, center, values, and date/time." />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="table-cell">Date/Time</th>
                <th className="table-cell">Action</th>
                <th className="table-cell">User</th>
                <th className="table-cell">Role</th>
                <th className="table-cell">Call Center</th>
                <th className="table-cell">File / Record</th>
                <th className="table-cell">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="table-cell font-semibold text-slate-700">{formatDateTime(log.createdAt)}</td>
                  <td className="table-cell"><SoftBadge tone={log.actionType.includes('delete') ? 'red' : log.actionType.includes('upload') ? 'blue' : 'slate'}>{log.actionType.replaceAll('_', ' ')}</SoftBadge></td>
                  <td className="table-cell"><p className="font-black text-slate-950">{log.userName}</p><p className="text-xs text-slate-500">{log.userEmail}</p></td>
                  <td className="table-cell text-slate-600">{log.userRole}</td>
                  <td className="table-cell text-slate-600">{log.callCenterName || 'All'}</td>
                  <td className="table-cell text-slate-600"><p className="max-w-52 truncate">{log.fileName || log.affectedRecordId || '—'}</p></td>
                  <td className="table-cell max-w-lg text-slate-600">{log.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
