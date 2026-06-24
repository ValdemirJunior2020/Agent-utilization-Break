import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { CALL_CENTERS } from '../constants/callCenters';
import { getDashboardRecords } from '../services/dashboardService';
import type { BreakRecord } from '../types';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/ui/StatCard';

export function CallCentersPage() {
  const [records, setRecords] = useState<BreakRecord[]>([]);
  useEffect(() => {
    getDashboardRecords().then((data) => setRecords(data.records));
  }, []);

  const rows = useMemo(() => {
    return CALL_CENTERS.map((center) => {
      const centerRecords = records.filter((record) => record.callCenterId === center.id);
      return {
        ...center,
        reviewed: centerRecords.length,
        issues: centerRecords.filter((record) => record.breakMinutes > 60).length,
        critical: centerRecords.filter((record) => record.status === 'critical').length,
        agents: new Set(centerRecords.map((record) => record.agentHpId)).size,
      };
    });
  }, [records]);

  return (
    <div>
      <PageHeader title="Call Center Details" description="Operational center list separated by WNS, Teleperformance, Buwelo Colombia, Buwelo Ghana, Concentrix, and Telus." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((center) => (
          <div key={center.id} className="card rounded-3xl p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-950">{center.name}</h2>
                <p className="text-sm text-slate-500">{center.region || 'Operations center'}</p>
              </div>
              <div className="rounded-2xl bg-slate-950 p-3 text-white"><Building2 /></div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <StatCard title="Reviewed" value={center.reviewed} />
              <StatCard title="Issues" value={center.issues} tone="amber" />
              <StatCard title="Critical" value={center.critical} tone="red" />
            </div>
            <Link to={`/records?callCenterId=${center.id}`} className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">View Records</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
