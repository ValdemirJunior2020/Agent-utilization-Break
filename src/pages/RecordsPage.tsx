import { useEffect, useMemo, useState } from 'react';
import { Download, Plus, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { CALL_CENTERS } from '../constants/callCenters';
import { useAuthStore, canEdit as canEditProfile, isSuperAdmin } from '../store/authStore';
import type { BreakRecord, BreakStatus, ParsedBreakRecordInput, RecordsFilters } from '../types';
import { addManualRecord, bulkSoftDeleteRecords, bulkUpdateRecords, getBreakRecords, softDeleteRecord, updateBreakRecord, type BulkRecordUpdates } from '../services/recordsService';
import { getThresholdSettings } from '../services/settingsService';
import { getBreakStatus } from '../utils/status';
import { formatDateRange, normalizeReportPeriod, todayISO } from '../utils/dates';
import { exportRecordsToExcel } from '../utils/export';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { RecordsFiltersBar } from '../components/records/RecordsFilters';
import { RecordsTable } from '../components/records/RecordsTable';
import { RecordFormModal } from '../components/records/RecordFormModal';
import { Modal } from '../components/ui/Modal';
import { Field, Input, Select, Textarea } from '../components/ui/Input';

export function RecordsPage() {
  const profile = useAuthStore((state) => state.profile)!;
  const superAdmin = isSuperAdmin(profile);
  const canEdit = canEditProfile(profile);
  const [filters, setFilters] = useState<RecordsFilters>(superAdmin ? {} : { callCenterId: profile.callCenterId ?? undefined });
  const [records, setRecords] = useState<BreakRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<BreakRecord | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    const result = await getBreakRecords(superAdmin ? filters : { ...filters, callCenterId: profile.callCenterId ?? undefined }, 2000);
    setRecords(result);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters), profile.callCenterId]);

  useEffect(() => {
    setSelectedIds((current) => new Set([...current].filter((id) => records.some((record) => record.id === id))));
  }, [records]);

  const selectedRecords = useMemo(() => records.filter((record) => selectedIds.has(record.id)), [records, selectedIds]);

  function toggleSelected(recordId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(recordId)) next.delete(recordId);
      else next.add(recordId);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelectedIds((current) => {
      const next = new Set(current);
      const allSelected = records.every((record) => next.has(record.id));
      records.forEach((record) => {
        if (allSelected) next.delete(record.id);
        else next.add(record.id);
      });
      return next;
    });
  }

  async function handleDelete(record: BreakRecord) {
    if (!confirm(`Soft delete ${record.agentHpId || record.agentName} for ${formatDateRange(record.reportStartDate || record.reportDate, record.reportEndDate || record.reportDate)}?`)) return;
    await softDeleteRecord(record, profile);
    await load();
  }

  async function handleBulkDelete() {
    if (!selectedRecords.length) return;
    if (!confirm(`Soft delete ${selectedRecords.length} selected record${selectedRecords.length === 1 ? '' : 's'}?`)) return;
    await bulkSoftDeleteRecords(selectedRecords, profile);
    setSelectedIds(new Set());
    await load();
  }

  async function handleSave(updates: Partial<BreakRecord>) {
    if (!editing) return;
    await updateBreakRecord(editing.id, updates, profile);
    await load();
  }

  return (
    <div>
      <PageHeader
        title="All Break Records"
        description="Search, filter, bulk change, edit, soft-delete, and export break compliance records. Every row includes its report date, upload file, and call center."
        actions={
          <>
            {canEdit && <Button onClick={() => setManualOpen(true)}><Plus size={18} /> Add Record</Button>}
            <Button variant="secondary" onClick={() => exportRecordsToExcel(records, 'agent-break-records.xlsx')}><Download size={18} /> Export Excel</Button>
          </>
        }
      />
      <RecordsFiltersBar filters={filters} setFilters={setFilters} superAdmin={superAdmin} />

      {canEdit && selectedRecords.length > 0 && (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-black text-slate-950">{selectedRecords.length} selected</p>
            <p className="text-sm text-slate-600">Bulk update status, exception reason, notes, report date, or call center without editing rows one by one.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setSelectedIds(new Set())}><X size={18} /> Clear</Button>
            <Button onClick={() => setBulkOpen(true)}><SlidersHorizontal size={18} /> Bulk Change</Button>
            <Button variant="danger" onClick={handleBulkDelete}><Trash2 size={18} /> Bulk Delete</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl bg-white p-8 text-slate-500">Loading records...</div>
      ) : (
        <RecordsTable
          records={records}
          canEdit={canEdit}
          selectable={canEdit}
          selectedIds={selectedIds}
          onToggleSelected={toggleSelected}
          onToggleAllVisible={toggleAllVisible}
          onEdit={setEditing}
          onDelete={handleDelete}
        />
      )}
      {editing && <RecordFormModal record={editing} onClose={() => setEditing(null)} onSave={handleSave} />}
      {manualOpen && <ManualRecordModal onClose={() => setManualOpen(false)} onCreated={load} />}
      {bulkOpen && <BulkChangeModal records={selectedRecords} onClose={() => setBulkOpen(false)} onChanged={async () => { setBulkOpen(false); setSelectedIds(new Set()); await load(); }} />}
    </div>
  );
}

function BulkChangeModal({ records, onClose, onChanged }: { records: BreakRecord[]; onClose: () => void; onChanged: () => Promise<void> }) {
  const profile = useAuthStore((state) => state.profile)!;
  const superAdmin = isSuperAdmin(profile);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    applyStatus: false,
    status: 'warning' as BreakStatus,
    applyException: false,
    exceptionReason: '',
    applyNotes: false,
    notes: '',
    applyReportDate: false,
    reportDate: todayISO(),
    reportStartDate: todayISO(),
    reportEndDate: todayISO(),
    applyCallCenter: false,
    callCenterId: profile.callCenterId ?? CALL_CENTERS[0].id,
  });

  async function submit() {
    const updates: BulkRecordUpdates = {};
    if (form.applyStatus) updates.status = form.status;
    if (form.applyException) updates.exceptionReason = form.exceptionReason.trim();
    if (form.applyNotes) updates.notes = form.notes.trim();
    if (form.applyReportDate) {
      const period = normalizeReportPeriod(form.reportStartDate, form.reportEndDate);
      updates.reportDate = period.reportDate;
      updates.reportStartDate = period.reportStartDate;
      updates.reportEndDate = period.reportEndDate;
      updates.reportDays = period.reportDays;
    }
    if (form.applyCallCenter && superAdmin) {
      const center = CALL_CENTERS.find((item) => item.id === form.callCenterId)!;
      updates.callCenterId = center.id;
      updates.callCenterName = center.name;
    }

    if (!Object.keys(updates).length) {
      alert('Choose at least one field to bulk change.');
      return;
    }

    setSaving(true);
    await bulkUpdateRecords(records, updates, profile);
    setSaving(false);
    await onChanged();
  }

  return (
    <Modal
      title={`Bulk Change ${records.length} Record${records.length === 1 ? '' : 's'}`}
      onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={saving}>{saving ? 'Saving...' : 'Apply Bulk Change'}</Button></>}
    >
      <div className="space-y-4">
        <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">Only checked fields below will be changed. Blank checked fields will intentionally clear that field for all selected records.</p>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-start gap-3 rounded-2xl border border-slate-100 p-3">
            <input type="checkbox" checked={form.applyStatus} onChange={(e) => setForm({ ...form, applyStatus: e.target.checked })} className="mt-1 h-4 w-4" />
            <Field label="Set Status">
              <Select disabled={!form.applyStatus} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as BreakStatus })}>
                <option value="good">Good</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </Select>
            </Field>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-100 p-3">
            <input type="checkbox" checked={form.applyReportDate} onChange={(e) => setForm({ ...form, applyReportDate: e.target.checked })} className="mt-1 h-4 w-4" />
            <div className="grid gap-3">
              <Field label="Set Report Start">
                <Input disabled={!form.applyReportDate} type="date" value={form.reportStartDate} onChange={(e) => setForm({ ...form, reportStartDate: e.target.value })} />
              </Field>
              <Field label="Set Report End">
                <Input disabled={!form.applyReportDate} type="date" value={form.reportEndDate} onChange={(e) => setForm({ ...form, reportEndDate: e.target.value, reportDate: e.target.value })} />
              </Field>
            </div>
          </label>

          {superAdmin && (
            <label className="flex items-start gap-3 rounded-2xl border border-slate-100 p-3 md:col-span-2">
              <input type="checkbox" checked={form.applyCallCenter} onChange={(e) => setForm({ ...form, applyCallCenter: e.target.checked })} className="mt-1 h-4 w-4" />
              <Field label="Move to Call Center">
                <Select disabled={!form.applyCallCenter} value={form.callCenterId} onChange={(e) => setForm({ ...form, callCenterId: e.target.value })}>
                  {CALL_CENTERS.map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}
                </Select>
              </Field>
            </label>
          )}

          <label className="flex items-start gap-3 rounded-2xl border border-slate-100 p-3 md:col-span-2">
            <input type="checkbox" checked={form.applyException} onChange={(e) => setForm({ ...form, applyException: e.target.checked })} className="mt-1 h-4 w-4" />
            <Field label="Set Exception Reason">
              <Textarea disabled={!form.applyException} value={form.exceptionReason} onChange={(e) => setForm({ ...form, exceptionReason: e.target.value })} placeholder="Example: approved legal/labor exception, training lead, new agent, system issue..." />
            </Field>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-100 p-3 md:col-span-2">
            <input type="checkbox" checked={form.applyNotes} onChange={(e) => setForm({ ...form, applyNotes: e.target.checked })} className="mt-1 h-4 w-4" />
            <Field label="Set Notes">
              <Textarea disabled={!form.applyNotes} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Internal note for all selected rows." />
            </Field>
          </label>
        </div>
      </div>
    </Modal>
  );
}

function ManualRecordModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> }) {
  const profile = useAuthStore((state) => state.profile)!;
  const superAdmin = isSuperAdmin(profile);
  const initialCenter = profile.callCenterId ?? CALL_CENTERS[0].id;
  const [form, setForm] = useState({
    callCenterId: initialCenter,
    agentHpId: '',
    agentName: '',
    reportDate: todayISO(),
    reportStartDate: todayISO(),
    reportEndDate: todayISO(),
    breakMinutes: '0',
    notes: '',
    exceptionReason: '',
  });
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    const center = CALL_CENTERS.find((item) => item.id === form.callCenterId)!;
    const thresholds = await getThresholdSettings();
    const breakMinutes = Number(form.breakMinutes);
    const period = normalizeReportPeriod(form.reportStartDate, form.reportEndDate);
    const input: ParsedBreakRecordInput = {
      callCenterId: center.id,
      callCenterName: center.name,
      agentHpId: form.agentHpId.trim(),
      agentName: form.agentName.trim(),
      reportDate: period.reportDate,
      reportStartDate: period.reportStartDate,
      reportEndDate: period.reportEndDate,
      reportDays: period.reportDays,
      reportLabel: 'Manual Entry',
      sheetName: 'Manual Entry',
      reportType: 'summary',
      breakMinutes,
      status: getBreakStatus(breakMinutes, thresholds),
      notes: form.notes.trim(),
      exceptionReason: form.exceptionReason.trim(),
      sourceFileName: 'Manual Entry',
    };
    await addManualRecord(input, profile);
    setSaving(false);
    onClose();
    await onCreated();
  }

  return (
    <Modal
      title="Add Manual Break Record"
      onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={saving}>{saving ? 'Saving...' : 'Create Record'}</Button></>}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Call Center">
          <Select disabled={!superAdmin} value={form.callCenterId} onChange={(e) => setForm({ ...form, callCenterId: e.target.value })}>
            {CALL_CENTERS.map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}
          </Select>
        </Field>
        <Field label="Report Start Date"><Input type="date" value={form.reportStartDate} onChange={(e) => setForm({ ...form, reportStartDate: e.target.value })} /></Field>
        <Field label="Report End Date"><Input type="date" value={form.reportEndDate} onChange={(e) => setForm({ ...form, reportEndDate: e.target.value, reportDate: e.target.value })} /></Field>
        <Field label="Agent HP ID"><Input value={form.agentHpId} onChange={(e) => setForm({ ...form, agentHpId: e.target.value })} /></Field>
        <Field label="Agent Name"><Input value={form.agentName} onChange={(e) => setForm({ ...form, agentName: e.target.value })} /></Field>
        <Field label="Break Minutes"><Input type="number" step="0.01" value={form.breakMinutes} onChange={(e) => setForm({ ...form, breakMinutes: e.target.value })} /></Field>
        <div className="md:col-span-2"><Field label="Exception Reason"><Textarea value={form.exceptionReason} onChange={(e) => setForm({ ...form, exceptionReason: e.target.value })} /></Field></div>
        <div className="md:col-span-2"><Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field></div>
      </div>
    </Modal>
  );
}
