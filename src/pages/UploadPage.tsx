import { useMemo, useState } from 'react';
import { UploadCloud, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuthStore, canUploadForCenter, isSuperAdmin } from '../store/authStore';
import { CALL_CENTERS, inferCallCenterFromFileName } from '../constants/callCenters';
import { addDaysISO, formatDateRange, normalizeReportPeriod, reportPeriodDays, todayISO } from '../utils/dates';
import { parseBreakExcel, type ParseResult } from '../utils/excelParser';
import { uploadAndProcessExcel } from '../services/uploadService';
import { getThresholdSettings } from '../services/settingsService';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/Badge';

export function UploadPage() {
  const profile = useAuthStore((state) => state.profile)!;
  const superAdmin = isSuperAdmin(profile);
  const [file, setFile] = useState<File | null>(null);
  const [callCenterId, setCallCenterId] = useState(profile.callCenterId ?? 'wns');
  const [reportEndDate, setReportEndDate] = useState(todayISO());
  const [reportStartDate, setReportStartDate] = useState(addDaysISO(todayISO(), -7));
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [replaceOverlappingDates, setReplaceOverlappingDates] = useState(true);

  const selectedCenter = useMemo(() => CALL_CENTERS.find((center) => center.id === callCenterId)!, [callCenterId]);
  const uploadAllowed = canUploadForCenter(profile, callCenterId);
  const period = normalizeReportPeriod(reportStartDate, reportEndDate);
  const periodInvalid = reportStartDate > reportEndDate;

  function setQuickPeriod(days: 1 | 3 | 7 | 30) {
    setReportStartDate(addDaysISO(reportEndDate, days === 1 ? 0 : -days));
  }

  async function onFileChange(selected: File | null) {
    setFile(selected);
    setParseResult(null);
    setMessage(null);
    if (!selected) return;

    const inferred = inferCallCenterFromFileName(selected.name);
    if (superAdmin && inferred) setCallCenterId(inferred.id);
  }

  async function previewFile() {
    if (!file || !selectedCenter) return;
    setLoading(true);
    setMessage(null);
    try {
      const thresholds = await getThresholdSettings();
      if (periodInvalid) throw new Error('Report start date cannot be after the report end date.');
      const result = await parseBreakExcel({ file, callCenterId: selectedCenter.id, callCenterName: selectedCenter.name, reportDate: period.reportDate, reportStartDate: period.reportStartDate, reportEndDate: period.reportEndDate, thresholds });
      setParseResult(result);
      setMessage(`Preview ready: ${result.records.length} records detected for ${formatDateRange(period.reportStartDate, period.reportEndDate)} across ${result.sheetsProcessed.length} sheet(s).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to preview the Excel file.');
    } finally {
      setLoading(false);
    }
  }

  async function submitUpload() {
    if (!file || !selectedCenter || !uploadAllowed) return;
    setLoading(true);
    setProgress(0);
    setMessage(null);
    try {
      const result = await uploadAndProcessExcel({
        file,
        callCenterId: selectedCenter.id,
        callCenterName: selectedCenter.name,
        reportDate: period.reportDate,
        reportStartDate: period.reportStartDate,
        reportEndDate: period.reportEndDate,
        actor: profile,
        replaceOverlappingDates,
        onProgress: setProgress,
      });
      setParseResult(result);
      const supersededMessage = replaceOverlappingDates
        ? ` Superseded ${result.supersededRecordCount} older overlapping record(s) and ${result.supersededUploadCount} previous upload(s).`
        : ' Older overlapping records were kept because append mode was selected.';
      setMessage(`Upload complete for ${formatDateRange(period.reportStartDate, period.reportEndDate)}: ${result.records.length} records saved, ${result.totalFlagged} above 60 minutes, ${result.totalCritical} critical.${supersededMessage}`);
      setFile(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setLoading(false);
    }
  }

  const previewStats = parseResult
    ? {
        total: parseResult.records.length,
        warning: parseResult.records.filter((record) => record.status === 'warning').length,
        critical: parseResult.records.filter((record) => record.status === 'critical').length,
      }
    : null;

  return (
    <div>
      <PageHeader
        title="Upload Excel Report"
        description="Upload Tableau `.xlsx` files and choose the exact report period, such as 06/16/2026 - 06/23/2026 for a 7-day report. The start and end dates are saved on every record."
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="card rounded-3xl p-6">
          <div className="grid gap-5 md:grid-cols-3">
            <Field label="Call Center">
              <Select value={callCenterId} onChange={(e) => setCallCenterId(e.target.value)} disabled={!superAdmin}>
                {CALL_CENTERS.map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}
              </Select>
            </Field>
            <Field label="Report Start Date">
              <Input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} required />
            </Field>
            <Field label="Report End Date">
              <Input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} required />
            </Field>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-slate-950">Selected report period</p>
                <p className="text-sm text-slate-600">{formatDateRange(period.reportStartDate, period.reportEndDate)} · {reportPeriodDays(period.reportStartDate, period.reportEndDate)} day report</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[1, 3, 7, 30].map((days) => (
                  <Button key={days} type="button" variant="secondary" className="px-3 py-2 text-xs" onClick={() => setQuickPeriod(days as 1 | 3 | 7 | 30)}>
                    {days}-day
                  </Button>
                ))}
              </div>
            </div>
            {periodInvalid && <p className="mt-3 text-sm font-bold text-red-700">Start date cannot be after end date.</p>}
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={replaceOverlappingDates}
                onChange={(event) => setReplaceOverlappingDates(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />
              <span>
                <span className="block text-sm font-black text-slate-950">Replace overlapping dates for this call center</span>
                <span className="mt-1 block text-sm text-slate-600">
                  Recommended. If you upload a 30-day report that includes an existing 7-day or 1-day report,
                  the older overlapping records are soft-deleted as superseded so the dashboard does not double count agents.
                </span>
              </span>
            </label>
          </div>

          <div className="mt-6 rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-white text-slate-600 shadow-sm"><UploadCloud size={32} /></div>
            <h3 className="mt-4 text-xl font-black text-slate-950">Drop your Tableau Excel file here</h3>
            <p className="mt-2 text-sm text-slate-500">Accepted format: `.xlsx`. The parser identifies HP IDs, names, dates, break minutes, and exceptions.</p>
            <Input className="mt-5" type="file" accept=".xlsx" onChange={(e) => onFileChange(e.target.files?.[0] ?? null)} />
            {file && <p className="mt-3 text-sm font-bold text-slate-700">Selected: {file.name}</p>}
          </div>

          {!uploadAllowed && <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">You can only upload for your assigned call center.</div>}
          {progress > 0 && progress < 100 && <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-slate-950" style={{ width: `${progress}%` }} /></div>}
          {message && <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">{message}</div>}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={previewFile} disabled={!file || loading || periodInvalid}>Preview Parser Results</Button>
            <Button onClick={submitUpload} disabled={!file || loading || !uploadAllowed || periodInvalid}>{loading ? 'Processing...' : 'Upload and Save Records'}</Button>
          </div>
        </section>

        <section className="card rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-950 p-3 text-white"><FileSpreadsheet /></div>
            <div>
              <h2 className="text-xl font-black text-slate-950">Parser Preview</h2>
              <p className="text-sm text-slate-500">Confirms format before Firestore save.</p>
            </div>
          </div>

          {previewStats ? (
            <div className="mt-6 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-500">Records</p><p className="mt-1 text-3xl font-black">{previewStats.total}</p></div>
                <div className="rounded-2xl bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-700">Warning</p><p className="mt-1 text-3xl font-black text-amber-800">{previewStats.warning}</p></div>
                <div className="rounded-2xl bg-red-50 p-4"><p className="text-sm font-semibold text-red-700">Critical</p><p className="mt-1 text-3xl font-black text-red-800">{previewStats.critical}</p></div>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-sm font-black text-slate-950">Sheets processed</p>
                <p className="mt-1 text-sm text-slate-600">{parseResult?.sheetsProcessed.join(', ')}</p>
                <p className="mt-3 text-sm font-black text-slate-950">Parser mode</p>
                <p className="mt-1 text-sm text-slate-600">{parseResult?.parserMode}</p>
              </div>
              <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-100">
                {parseResult?.records.slice(0, 10).map((record, index) => (
                  <div key={`${record.agentHpId}-${index}`} className="flex items-center justify-between gap-3 border-b border-slate-100 p-3 last:border-b-0">
                    <div>
                      <p className="font-black text-slate-950">{record.agentHpId}</p>
                      <p className="text-xs text-slate-500">{formatDateRange(record.reportStartDate, record.reportEndDate)} · {record.breakMinutes.toFixed(2)} min</p>
                    </div>
                    <StatusBadge status={record.status} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-8 rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">
              <CheckCircle2 className="mb-3 text-emerald-600" />
              Choose a file and click preview. The app will show detected records, dates, warning count, and critical count before saving.
            </div>
          )}

          <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
            <div className="mb-2 flex items-center gap-2 font-black"><AlertTriangle size={18} /> Date requirement</div>
            Select the exact start and end date for every upload. A 7-day file can be saved as 06/16/2026 - 06/23/2026, while a 1-day file can use the same start and end date. Keep replace-overlap enabled to prevent duplicated counts when a longer report includes shorter reports already uploaded.
          </div>
        </section>
      </div>
    </div>
  );
}
