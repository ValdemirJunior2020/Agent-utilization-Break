import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { BreakRecord } from '../types';
import { getBreakRecords } from '../services/recordsService';
import { useAuthStore, isSuperAdmin } from '../store/authStore';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { RecordsTable } from '../components/records/RecordsTable';
import { minutesToHoursMinutes } from '../utils/format';

export function AgentDetailsPage() {
  const { agentHpId = '' } = useParams();
  const profile = useAuthStore((state) => state.profile)!;
  const [records, setRecords] = useState<BreakRecord[]>([]);
  const superAdmin = isSuperAdmin(profile);

  useEffect(() => {
    getBreakRecords({ callCenterId: superAdmin ? undefined : profile.callCenterId ?? undefined, search: decodeURIComponent(agentHpId) }, 1000).then((items) => {
      const decoded = decodeURIComponent(agentHpId).toLowerCase();
      setRecords(items.filter((record) => record.agentHpId.toLowerCase() === decoded || record.agentName.toLowerCase() === decoded));
    });
  }, [agentHpId, profile.callCenterId, superAdmin]);

  const stats = useMemo(() => {
    const above60 = records.filter((record) => record.breakMinutes > 60).length;
    const critical = records.filter((record) => record.status === 'critical').length;
    const max = Math.max(0, ...records.map((record) => record.breakMinutes));
    const avg = records.length ? records.reduce((sum, record) => sum + record.breakMinutes, 0) / records.length : 0;
    return { above60, critical, max, avg };
  }, [records]);

  const chart = records.map((record) => ({ date: record.reportDate, minutes: record.breakMinutes })).sort((a, b) => a.date.localeCompare(b.date));
  const titleAgent = records[0]?.agentName || records[0]?.agentHpId || decodeURIComponent(agentHpId);

  return (
    <div>
      <PageHeader title={`Agent Details: ${titleAgent}`} description="Individual break-time history with all dates, uploads, status changes, notes, and exceptions." />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Records" value={records.length} />
        <StatCard title="Above 60" value={stats.above60} tone="amber" />
        <StatCard title="Critical" value={stats.critical} tone="red" />
        <StatCard title="Max Break" value={minutesToHoursMinutes(stats.max)} />
      </div>
      <section className="card mt-6 rounded-2xl p-5">
        <h2 className="text-lg font-black text-slate-950">Break Time Trend</h2>
        <p className="text-sm text-slate-500">Average: {minutesToHoursMinutes(stats.avg)}</p>
        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(value) => String(value).slice(5)} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="minutes" strokeWidth={3} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
      <div className="mt-6"><RecordsTable records={records} canEdit={false} /></div>
    </div>
  );
}
