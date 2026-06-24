import type { ReactNode } from 'react';
import clsx from 'clsx';
import type { BreakStatus } from '../../types';
import { statusClasses, statusLabel } from '../../utils/status';

export function StatusBadge({ status }: { status: BreakStatus }) {
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1', statusClasses(status))}>
      {statusLabel(status)}
    </span>
  );
}

export function SoftBadge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'blue' | 'emerald' | 'red' | 'amber' }) {
  const classes = {
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    blue: 'bg-blue-100 text-blue-700 ring-blue-200',
    emerald: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    red: 'bg-red-100 text-red-700 ring-red-200',
    amber: 'bg-amber-100 text-amber-800 ring-amber-200',
  }[tone];

  return <span className={clsx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1', classes)}>{children}</span>;
}
