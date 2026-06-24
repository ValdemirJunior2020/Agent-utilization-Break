import type { RecordsFilters } from '../../types';
import { CALL_CENTERS } from '../../constants/callCenters';
import { Button } from '../ui/Button';
import { Field, Input, Select } from '../ui/Input';

export function RecordsFiltersBar({ filters, setFilters, superAdmin }: { filters: RecordsFilters; setFilters: (filters: RecordsFilters) => void; superAdmin: boolean }) {
  return (
    <div className="card mb-6 grid gap-4 rounded-2xl p-4 md:grid-cols-6">
      {superAdmin && (
        <Field label="Call Center">
          <Select value={filters.callCenterId ?? ''} onChange={(e) => setFilters({ ...filters, callCenterId: e.target.value || undefined })}>
            <option value="">All centers</option>
            {CALL_CENTERS.map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}
          </Select>
        </Field>
      )}
      <Field label="Status">
        <Select value={filters.status ?? 'all'} onChange={(e) => setFilters({ ...filters, status: e.target.value as RecordsFilters['status'] })}>
          <option value="all">All statuses</option>
          <option value="good">Good</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </Select>
      </Field>
      <Field label="Start Date"><Input type="date" value={filters.startDate ?? ''} onChange={(e) => setFilters({ ...filters, startDate: e.target.value || undefined })} /></Field>
      <Field label="End Date"><Input type="date" value={filters.endDate ?? ''} onChange={(e) => setFilters({ ...filters, endDate: e.target.value || undefined })} /></Field>
      <Field label="Search"><Input placeholder="HP ID or name" value={filters.search ?? ''} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></Field>
      <div className="flex items-end">
        <Button variant="secondary" className="w-full" onClick={() => setFilters({})}>Clear Filters</Button>
      </div>
    </div>
  );
}
