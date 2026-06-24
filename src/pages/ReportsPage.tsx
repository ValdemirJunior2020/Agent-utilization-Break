import { useEffect, useMemo, useState } from 'react';
import { Copy, Download } from 'lucide-react';
import type { BreakRecord } from '../types';
import { getBreakRecords } from '../services/recordsService';
import { useAuthStore, isSuperAdmin } from '../store/authStore';
import { buildLeadershipSummary, exportRecordsToCsv, exportRecordsToExcel, exportYearlyImprovementToExcel } from '../utils/export';
import { buildYearlyImprovement, formatPercentagePointChange, getAvailableYears } from '../utils/improvementAnalytics';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/ui/StatCard';
import { Select } from '../components/ui/Input';
import { RecordsTable } from '../components/records/RecordsTable';

export function ReportsPage() {
  const profile = useAuthStore((state) => state.profile)!;
  const superAdmin = isSuperAdmin(profile);
  const [records, setRecords] = useState<BreakRecord[]>([]);
  const [copied, setCopied] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    getBreakRecords({ callCenterId: superAdmin ? undefined : profile.callCenterId ?? undefined }, 5000).then(setRecords);
  }, [profile.callCenterId, superAdmin]);

  const report = useMemo(() => {
    const active = records.filter((record) => !record.deleted);
    const above60 = active.filter((record) => record.breakMinutes > 60);
    const critical = active.filter((record) => record.status === 'critical');
    const repeated = Object.values(
      above60.reduce<Record<string, { agent: string; count: number }>>((acc, record) => {
        const key = `${record.callCenterId}:${record.agentHpId}`;
        if (!acc[key]) acc[key] = { agent: record.agentHpId || record.agentName, count: 0 };
        acc[key].count += 1;
        return acc;
      }, {}),
    ).filter((item) => item.count > 1);
    return { active, above60, critical, repeated };
  }, [records]);

  const availableYears = useMemo(() => getAvailableYears(records), [records]);
  const yearlyImprovement = useMemo(() => buildYearlyImprovement(records, selectedYear), [records, selectedYear]);
  const emailSummary = buildLeadershipSummary(records);

  async function copySummary() {
    await navigator.clipboard.writeText(emailSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Export leadership reports, repeated issue agents, yearly improvement, 7-day summaries, deleted/edited records, and upload history."
        actions={
          <>
            <Select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="min-w-28">
              {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </Select>
            <Button variant="secondary" onClick={() => exportYearlyImprovementToExcel(yearlyImprovement)}><Download size={18} /> Yearly Improvement</Button>
            <Button variant="secondary" onClick={() => exportRecordsToExcel(report.above60, 'agents-above-60-minutes.xlsx')}><Download size={18} /> Above 60 Excel</Button>
            <Button variant="secondary" onClick={() => exportRecordsToCsv(report.active, 'break-records.csv')}><Download size={18} /> CSV</Button>
            <Button onClick={copySummary}><Copy size={18} /> {copied ? 'Copied' : 'Copy Email Summary'}</Button>
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Active Records" value={report.active.length} />
        <StatCard title="Above 60" value={report.above60.length} tone="amber" />
        <StatCard title="Critical" value={report.critical.length} tone="red" />
        <StatCard title="Repeated Agents" value={report.repeated.length} tone="blue" />
      </div>

      <section className="card mt-6 rounded-3xl p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">Yearly Improvement Report — {selectedYear}</h2>
            <p className="text-sm text-slate-500">Tracks whether each call center is improving across the year by lowering the percentage of agents above 60 minutes.</p>
          </div>
          <p className="text-sm font-bold text-slate-600">First to latest: {formatPercentagePointChange(yearlyImprovement.improvementFromFirstToLatest)}</p>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <StatCard title="Annual Issue Rate" value={`${yearlyImprovement.annualIssueRate}%`} helper={`${yearlyImprovement.totalAbove60} above 60`} tone="amber" />
          <StatCard title="Critical Rate" value={`${yearlyImprovement.annualCriticalRate}%`} helper={`${yearlyImprovement.totalCritical} critical`} tone="red" />
          <StatCard title="Best Month" value={yearlyImprovement.bestMonth?.label ?? '—'} helper={yearlyImprovement.bestMonth ? `${yearlyImprovement.bestMonth.issueRate}% issue rate` : 'No data'} tone="blue" />
          <StatCard title="Avg Break" value={`${yearlyImprovement.averageBreakMinutes} min`} helper={`${yearlyImprovement.monthsImproved} month(s) improved`} />
        </div>
        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="table-cell">Month</th>
                <th className="table-cell">Reviewed</th>
                <th className="table-cell">Above 60</th>
                <th className="table-cell">Critical</th>
                <th className="table-cell">Issue Rate</th>
                <th className="table-cell">Avg Break</th>
                <th className="table-cell">Improvement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {yearlyImprovement.months.map((month) => (
                <tr key={month.month} className="hover:bg-slate-50/70">
                  <td className="table-cell font-black text-slate-950">{month.label}</td>
                  <td className="table-cell">{month.reviewed}</td>
                  <td className="table-cell">{month.above60}</td>
                  <td className="table-cell">{month.critical}</td>
                  <td className="table-cell">{month.reviewed ? `${month.issueRate}%` : '—'}</td>
                  <td className="table-cell">{month.reviewed ? `${month.avgBreakMinutes} min` : '—'}</td>
                  <td className="table-cell text-sm font-semibold">{formatPercentagePointChange(month.improvementVsPrevious)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card mt-6 rounded-3xl p-6">
        <h2 className="text-xl font-black text-slate-950">Auto-generated Leadership Summary</h2>
        <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-slate-950 p-5 text-sm leading-6 text-slate-100">{emailSummary}</pre>
      </section>
      <div className="mt-6">
        <h2 className="mb-3 text-xl font-black text-slate-950">Agents Above 60 Minutes</h2>
        <RecordsTable records={report.above60} canEdit={false} />
      </div>
    </div>
  );
}
