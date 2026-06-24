import { Link } from 'react-router-dom';
import { Edit3, RotateCcw, Trash2 } from 'lucide-react';
import type { BreakRecord } from '../../types';
import { formatDate, formatDateRange, formatDateTime } from '../../utils/dates';
import { minutesToHoursMinutes } from '../../utils/format';
import { StatusBadge, SoftBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';

export function RecordsTable({
  records,
  canEdit,
  canRestore,
  selectable = false,
  selectedIds = new Set<string>(),
  onToggleSelected,
  onToggleAllVisible,
  onEdit,
  onDelete,
  onRestore,
}: {
  records: BreakRecord[];
  canEdit: boolean;
  canRestore?: boolean;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelected?: (recordId: string) => void;
  onToggleAllVisible?: () => void;
  onEdit?: (record: BreakRecord) => void;
  onDelete?: (record: BreakRecord) => void;
  onRestore?: (record: BreakRecord) => void;
}) {
  if (!records.length) return <EmptyState title="No records found" description="Upload an Excel report or adjust the filters to view break compliance data." />;

  const allVisibleSelected = records.length > 0 && records.every((record) => selectedIds.has(record.id));
  const someVisibleSelected = records.some((record) => selectedIds.has(record.id));

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-black uppercase tracking-wide text-slate-500">
              {selectable && (
                <th className="table-cell w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all visible records"
                    checked={allVisibleSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = someVisibleSelected && !allVisibleSelected;
                    }}
                    onChange={onToggleAllVisible}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </th>
              )}
              <th className="table-cell">Report Period</th>
              <th className="table-cell">Call Center</th>
              <th className="table-cell">Agent</th>
              <th className="table-cell">Break Time</th>
              <th className="table-cell">Status</th>
              <th className="table-cell">Exception</th>
              <th className="table-cell">Source</th>
              <th className="table-cell">Updated</th>
              <th className="table-cell text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((record) => (
              <tr key={record.id} className={selectedIds.has(record.id) ? 'bg-blue-50/60 hover:bg-blue-50' : 'hover:bg-slate-50/70'}>
                {selectable && (
                  <td className="table-cell">
                    <input
                      type="checkbox"
                      aria-label={`Select ${record.agentHpId || record.agentName}`}
                      checked={selectedIds.has(record.id)}
                      onChange={() => onToggleSelected?.(record.id)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </td>
                )}
                <td className="table-cell">
                  <p className="font-bold text-slate-700">{formatDateRange(record.reportStartDate || record.reportDate, record.reportEndDate || record.reportDate)}</p>
                  <p className="text-xs text-slate-500">End date: {formatDate(record.reportDate)}</p>
                </td>
                <td className="table-cell"><SoftBadge tone="blue">{record.callCenterName}</SoftBadge></td>
                <td className="table-cell">
                  <Link to={`/agents/${encodeURIComponent(record.agentHpId)}`} className="font-black text-slate-950 hover:underline">
                    {record.agentHpId || record.agentName}
                  </Link>
                  {record.agentName && <p className="text-xs text-slate-500">{record.agentName}</p>}
                </td>
                <td className="table-cell">
                  <p className="font-black text-slate-950">{record.breakMinutes.toFixed(2)} min</p>
                  <p className="text-xs text-slate-500">{minutesToHoursMinutes(record.breakMinutes)}</p>
                </td>
                <td className="table-cell"><StatusBadge status={record.status} /></td>
                <td className="table-cell max-w-xs truncate text-slate-600">{record.exceptionReason || record.notes || '—'}</td>
                <td className="table-cell">
                  <p className="max-w-48 truncate font-semibold text-slate-700">{record.sourceFileName}</p>
                  <p className="text-xs text-slate-500">{record.reportLabel}</p>
                </td>
                <td className="table-cell text-xs text-slate-500">{formatDateTime(record.updatedAt || record.uploadedAt)}</td>
                <td className="table-cell">
                  <div className="flex justify-end gap-2">
                    {canEdit && !record.deleted && onEdit && (
                      <Button variant="secondary" className="p-2" onClick={() => onEdit(record)} title="Edit record"><Edit3 size={16} /></Button>
                    )}
                    {canEdit && !record.deleted && onDelete && (
                      <Button variant="danger" className="p-2" onClick={() => onDelete(record)} title="Delete record"><Trash2 size={16} /></Button>
                    )}
                    {canRestore && record.deleted && onRestore && (
                      <Button variant="success" className="p-2" onClick={() => onRestore(record)} title="Restore record"><RotateCcw size={16} /></Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
