import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import type { ThresholdSettings } from '../types';
import { getThresholdSettings, saveThresholdSettings } from '../services/settingsService';
import { useAuthStore } from '../store/authStore';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Input';

export function SettingsPage() {
  const profile = useAuthStore((state) => state.profile)!;
  const [settings, setSettings] = useState<ThresholdSettings>({ goodMaxMinutes: 60, warningMinMinutes: 60.01, criticalMinMinutes: 90 });
  const [message, setMessage] = useState('');

  useEffect(() => {
    getThresholdSettings().then(setSettings);
  }, []);

  async function save() {
    await saveThresholdSettings(settings, profile);
    setMessage('Settings saved and audit log created.');
  }

  return (
    <div>
      <PageHeader title="Settings" description="Super Admin can update the break status thresholds used by parser, manual records, dashboards, and reports." />
      <section className="card max-w-2xl rounded-3xl p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Good max minutes"><Input type="number" value={settings.goodMaxMinutes} onChange={(e) => setSettings({ ...settings, goodMaxMinutes: Number(e.target.value), warningMinMinutes: Number(e.target.value) + 0.01 })} /></Field>
          <Field label="Warning min minutes"><Input type="number" step="0.01" value={settings.warningMinMinutes} onChange={(e) => setSettings({ ...settings, warningMinMinutes: Number(e.target.value) })} /></Field>
          <Field label="Critical min minutes"><Input type="number" value={settings.criticalMinMinutes} onChange={(e) => setSettings({ ...settings, criticalMinMinutes: Number(e.target.value) })} /></Field>
        </div>
        <div className="mt-6 flex items-center gap-3">
          <Button onClick={save}><Save size={18} /> Save Settings</Button>
          {message && <p className="text-sm font-semibold text-emerald-700">{message}</p>}
        </div>
      </section>
    </div>
  );
}
