import { useState } from 'react';
import type { BreakRecord } from '../../types';
import { normalizeReportPeriod } from '../../utils/dates';
import { Button } from '../ui/Button';
import { Field, Input, Textarea } from '../ui/Input';
import { Modal } from '../ui/Modal';

export function RecordFormModal({ record, onClose, onSave }: { record: BreakRecord; onClose: () => void; onSave: (updates: Partial<BreakRecord>) => Promise<void> }) {
  const [form, setForm] = useState({
    agentHpId: record.agentHpId,
    agentName: record.agentName,
    breakMinutes: String(record.breakMinutes),
    reportStartDate: record.reportStartDate || record.reportDate,
    reportEndDate: record.reportEndDate || record.reportDate,
    notes: record.notes ?? '',
    exceptionReason: record.exceptionReason ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    const period = normalizeReportPeriod(form.reportStartDate, form.reportEndDate);
    await onSave({
      agentHpId: form.agentHpId.trim(),
      agentName: form.agentName.trim(),
      breakMinutes: Number(form.breakMinutes),
      reportDate: period.reportDate,
      reportStartDate: period.reportStartDate,
      reportEndDate: period.reportEndDate,
      reportDays: period.reportDays,
      notes: form.notes.trim(),
      exceptionReason: form.exceptionReason.trim(),
    });
    setSaving(false);
    onClose();
  }

  return (
    <Modal
      title="Edit Break Record"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Agent HP ID"><Input value={form.agentHpId} onChange={(e) => setForm({ ...form, agentHpId: e.target.value })} /></Field>
        <Field label="Agent Name"><Input value={form.agentName} onChange={(e) => setForm({ ...form, agentName: e.target.value })} /></Field>
        <Field label="Report Start Date"><Input type="date" value={form.reportStartDate} onChange={(e) => setForm({ ...form, reportStartDate: e.target.value })} /></Field>
        <Field label="Report End Date"><Input type="date" value={form.reportEndDate} onChange={(e) => setForm({ ...form, reportEndDate: e.target.value })} /></Field>
        <Field label="Break Minutes"><Input type="number" step="0.01" value={form.breakMinutes} onChange={(e) => setForm({ ...form, breakMinutes: e.target.value })} /></Field>
        <div className="md:col-span-2"><Field label="Exception Reason"><Textarea value={form.exceptionReason} onChange={(e) => setForm({ ...form, exceptionReason: e.target.value })} /></Field></div>
        <div className="md:col-span-2"><Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field></div>
      </div>
    </Modal>
  );
}
