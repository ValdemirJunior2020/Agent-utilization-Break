import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Archive, FileSpreadsheet, Flame, MousePointerClick, TrendingDown, Trophy, Users } from 'lucide-react';
import { useAuthStore, isSuperAdmin } from '../store/authStore';
import { getDashboardRecords, getDashboardStats } from '../services/dashboardService';
import type { AuditLog, BreakRecord, DashboardStats, UploadBatch } from '../types';
import { buildYearlyImprovement, formatPercentagePointChange, getAvailableYears } from '../utils/improvementAnalytics';
import { exportYearlyImprovementToExcel } from '../utils/export';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { PageLoader } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Input';
import { formatDate, formatDateRange, formatDateTime } from '../utils/dates';
import { minutesToHoursMinutes } from '../utils/format';
import { StatusBadge } from '../components/ui/Badge';

export function DashboardPage() {
  const profile = useAuthStore((state) => state.profile)!;
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [records, setRecords] = useState<BreakRecord[]>([]);
  const [uploads, setUploads] = useState<UploadBatch[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [error, setError] = useState<string | null>(null);
  const superAdmin = isSuperAdmin(profile);
  const callCenterId = superAdmin ? null : profile.callCenterId;

  useEffect(() => {
    setError(null);
    Promise.all([getDashboardStats(callCenterId), getDashboardRecords(callCenterId)])
      .then(([statResult, data]) => {
        setStats(statResult);
        setRecords(data.records);
        setUploads(data.uploads);
        setLogs(data.auditLogs);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Unable to load dashboard data.';
        setError(message);
        setStats({ totalUploadedReports: 0, totalAgentsReviewed: 0, totalAbove60: 0, totalCritical: 0, totalDeleted: 0, totalVisits: 0, uniqueUsers: 0 });
      });
  }, [callCenterId]);

  const trend = useMemo(() => {
    const map = records.reduce<Record<string, { date: string; issues: number; critical: number }>>((acc, record) => {
      const key = record.reportDate;
      if (!acc[key]) acc[key] = { date: key, issues: 0, critical: 0 };
      if (record.breakMinutes > 60) acc[key].issues += 1;
      if (record.status === 'critical') acc[key].critical += 1;
      return acc;
    }, {});
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
  }, [records]);

  const centerRanking = useMemo(() => {
    const map = records.reduce<Record<string, number>>((acc, record) => {
      if (record.breakMinutes <= 60) return acc;
      acc[record.callCenterName] = (acc[record.callCenterName] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(map).map(([name, issues]) => ({ name, issues })).sort((a, b) => b.issues - a.issues).slice(0, 8);
  }, [records]);

  const repeatedAgents = useMemo(() => {
    const map = records.filter((record) => record.breakMinutes > 60).reduce<Record<string, { id: string; name: string; center: string; count: number; max: number }>>((acc, record) => {
      const key = `${record.callCenterId}:${record.agentHpId}`;
      if (!acc[key]) acc[key] = { id: record.agentHpId, name: record.agentName, center: record.callCenterName, count: 0, max: 0 };
      acc[key].count += 1;
      acc[key].max = Math.max(acc[key].max, record.breakMinutes);
      return acc;
    }, {});
    return Object.values(map).sort((a, b) => b.count - a.count || b.max - a.max).slice(0, 8);
  }, [records]);

  const availableYears = useMemo(() => getAvailableYears(records), [records]);
  const yearlyImprovement = useMemo(() => buildYearlyImprovement(records, selectedYear), [records, selectedYear]);

  if (!stats) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title={superAdmin ? 'Super Admin Dashboard' : `${profile.callCenterName} Dashboard`}
        description="Monitor break-time compliance, critical agents, repeated offenders, year-long improvement, upload history, and user activity with dates visible on every record."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="min-w-28">
              {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </Select>
            <Button variant="secondary" onClick={() => exportYearlyImprovementToExcel(yearlyImprovement)}>
              Export Yearly Improvement
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          Dashboard data could not load: {error}. If this mentions an index, create the Firebase index from the console link or deploy firestore.indexes.json.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard title="Uploaded Reports" value={stats.totalUploadedReports} icon={<FileSpreadsheet />} tone="blue" />
        <StatCard title="Agents Reviewed" value={stats.totalAgentsReviewed} icon={<Users />} />
        <StatCard title="Above 60 Min" value={stats.totalAbove60} icon={<AlertTriangle />} tone="amber" />
        <StatCard title="Critical 90+" value={stats.totalCritical} icon={<Flame />} tone="red" />
        <StatCard title="Deleted Records" value={stats.totalDeleted} icon={<Archive />} />
        <StatCard title="App Visits" value={stats.totalVisits} helper={`${stats.uniqueUsers} unique users`} icon={<MousePointerClick />} tone="emerald" />
      </div>

      <section className="card mt-6 rounded-3xl p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">Yearly Improvement Tracker</h2>
            <p className="text-sm text-slate-500">Month-by-month issue rate, critical rate, average break minutes, and improvement in percentage points for {selectedYear}.</p>
          </div>
          <p className="text-sm font-bold text-slate-600">Positive improvement means the issue rate went down.</p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Annual Issue Rate" value={`${yearlyImprovement.annualIssueRate}%`} helper={`${yearlyImprovement.totalAbove60} above 60 / ${yearlyImprovement.totalReviewed} reviewed`} icon={<AlertTriangle />} tone="amber" />
          <StatCard title="First → Latest" value={formatPercentagePointChange(yearlyImprovement.improvementFromFirstToLatest)} helper={`${yearlyImprovement.firstMonth?.label ?? '—'} to ${yearlyImprovement.latestMonth?.label ?? '—'}`} icon={<TrendingDown />} tone="emerald" />
          <StatCard title="Best Month" value={yearlyImprovement.bestMonth?.label ?? '—'} helper={yearlyImprovement.bestMonth ? `${yearlyImprovement.bestMonth.issueRate}% issue rate` : 'No yearly data yet'} icon={<Trophy />} tone="blue" />
          <StatCard title="Avg Break Time" value={`${yearlyImprovement.averageBreakMinutes} min`} helper={`${yearlyImprovement.monthsImproved} month(s) improved vs previous`} icon={<Users />} />
        </div>

        <div className="mt-6 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={yearlyImprovement.months}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis yAxisId="left" allowDecimals />
              <YAxis yAxisId="right" orientation="right" allowDecimals />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="issueRate" name="Issue Rate %" strokeWidth={2} connectNulls />
              <Line yAxisId="left" type="monotone" dataKey="criticalRate" name="Critical Rate %" strokeWidth={2} connectNulls />
              <Line yAxisId="right" type="monotone" dataKey="avgBreakMinutes" name="Avg Break Minutes" strokeWidth={2} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="table-cell">Month</th>
                <th className="table-cell">Reviewed</th>
                <th className="table-cell">Above 60</th>
                <th className="table-cell">Critical</th>
                <th className="table-cell">Issue Rate</th>
                <th className="table-cell">Avg Break</th>
                <th className="table-cell">Vs Previous</th>
                <th className="table-cell">Vs First Month</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {yearlyImprovement.months.map((month) => (
                <tr key={month.month} className="hover:bg-slate-50/70">
                  <td className="table-cell font-black text-slate-950">{month.label}</td>
                  <td className="table-cell">{month.reviewed}</td>
                  <td className="table-cell">{month.above60}</td>
                  <td className="table-cell">{month.critical}</td>
                  <td className="table-cell font-bold">{month.reviewed ? `${month.issueRate}%` : '—'}</td>
                  <td className="table-cell">{month.reviewed ? `${month.avgBreakMinutes} min` : '—'}</td>
                  <td className="table-cell text-sm font-semibold">{formatPercentagePointChange(month.improvementVsPrevious)}</td>
                  <td className="table-cell text-sm font-semibold">{formatPercentagePointChange(month.improvementVsFirst)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="card rounded-2xl p-5">
          <h2 className="text-lg font-black text-slate-950">Daily Break Issue Trend</h2>
          <p className="text-sm text-slate-500">Agents above 60 minutes by report date.</p>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(value) => String(value).slice(5)} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="issues" strokeWidth={2} fillOpacity={0.2} />
                <Area type="monotone" dataKey="critical" strokeWidth={2} fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card rounded-2xl p-5">
          <h2 className="text-lg font-black text-slate-950">Call Center Ranking</h2>
          <p className="text-sm text-slate-500">Centers with the most agents above 60 minutes.</p>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={centerRanking} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={130} />
                <Tooltip />
                <Bar dataKey="issues" radius={[0, 10, 10, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="card rounded-2xl p-5 xl:col-span-1">
          <h2 className="text-lg font-black text-slate-950">Top Repeated Agents</h2>
          <div className="mt-4 space-y-3">
            {repeatedAgents.map((agent) => (
              <div key={`${agent.center}-${agent.id}`} className="rounded-2xl border border-slate-100 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-slate-950">{agent.id}</p>
                  <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-black text-red-700">{agent.count}x</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{agent.name || agent.center}</p>
                <p className="mt-1 text-xs font-semibold text-slate-600">Max: {minutesToHoursMinutes(agent.max)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card rounded-2xl p-5 xl:col-span-1">
          <h2 className="text-lg font-black text-slate-950">Recent Uploads</h2>
          <div className="mt-4 space-y-3">
            {uploads.map((upload) => (
              <div key={upload.id} className="rounded-2xl border border-slate-100 p-3">
                <p className="truncate font-black text-slate-950">{upload.fileName}</p>
                <p className="text-xs text-slate-500">{upload.callCenterName} · {formatDateRange(upload.reportStartDate || upload.reportDate, upload.reportEndDate || upload.reportDate)}</p>
                <p className="mt-1 text-xs text-slate-500">Uploaded {formatDateTime(upload.uploadedAt)} by {upload.uploadedByName}</p>
                <p className="mt-2 text-xs font-semibold text-slate-600">{upload.totalRows} rows · {upload.totalFlagged} flagged · {upload.totalCritical} critical</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card rounded-2xl p-5 xl:col-span-1">
          <h2 className="text-lg font-black text-slate-950">Recent Audit Activity</h2>
          <div className="mt-4 space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="rounded-2xl border border-slate-100 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black capitalize text-slate-950">{log.actionType.replaceAll('_', ' ')}</p>
                  {log.callCenterName && <StatusBadge status={log.actionType.includes('delete') ? 'critical' : 'good'} />}
                </div>
                <p className="text-xs text-slate-500">{formatDateTime(log.createdAt)} · {log.userName}</p>
                <p className="mt-1 text-xs text-slate-600">{log.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
