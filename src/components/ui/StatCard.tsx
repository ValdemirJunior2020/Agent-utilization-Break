import type { ReactNode } from 'react';
import clsx from 'clsx';

export function StatCard({ title, value, helper, icon, tone = 'slate' }: { title: string; value: ReactNode; helper?: ReactNode; icon?: ReactNode; tone?: 'slate' | 'emerald' | 'amber' | 'red' | 'blue' }) {
  const ring = {
    slate: 'from-slate-950 to-slate-700',
    emerald: 'from-emerald-700 to-teal-600',
    amber: 'from-amber-600 to-orange-500',
    red: 'from-red-700 to-rose-600',
    blue: 'from-blue-700 to-indigo-600',
  }[tone];
  return (
    <div className="card rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</div>
          {helper && <p className="mt-2 text-sm text-slate-500">{helper}</p>}
        </div>
        {icon && <div className={clsx('rounded-2xl bg-gradient-to-br p-3 text-white shadow-lg', ring)}>{icon}</div>}
      </div>
    </div>
  );
}
