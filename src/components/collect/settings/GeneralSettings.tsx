import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { collectChanged } from '@/redux/slices/collectSlice';
import { getCollectSettings, putCollectSettings } from '@/api/collectApi';
import { apiError, fmtDate } from '@/lib/collect';
import { Chip, ErrorState, Field, INPUT, Loading, Panel, Select, Warning } from '@/components/collect/CollectUi';
import { ReadOnlyNote } from './ReadOnlyNote';
import type { CollectSettings } from '@/types/collect.types';

interface Form {
  company: string;
  senderEmail: string;
  internalEmail: string;
  contractPrefix: string;
  sar: string;
  usd: string;
  simulatedToday: string;
  reminderMode: 'manual' | 'auto';
}

const formOf = (s: CollectSettings): Form => ({
  company: s.company ?? '',
  senderEmail: s.senderEmail ?? '',
  internalEmail: s.internalEmail ?? '',
  contractPrefix: s.contractPrefix ?? '',
  sar: String(s.rates?.SAR ?? ''),
  usd: String(s.rates?.USD ?? ''),
  simulatedToday: s.simulatedToday ?? '',
  reminderMode: s.reminderMode ?? 'manual',
});

/** Settings › General */
export function GeneralSettings() {
  const dispatch = useAppDispatch();
  const canAdmin = useAppSelector((s) => !!s.collect.meta?.canAdmin);
  const realToday = useAppSelector((s) => (s.collect.meta?.simulated ? null : s.collect.meta?.today));
  const [settings, setSettings] = useState<CollectSettings | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const s = await getCollectSettings();
      setSettings(s);
      setForm(formOf(s));
    } catch (e) {
      setError(apiError(e, 'Could not load the settings'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!form || !settings) return <Loading rows={5} />;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const ro = !canAdmin;

  const save = async () => {
    setSaving(true);
    try {
      const r = await putCollectSettings({
        company: form.company,
        senderEmail: form.senderEmail,
        internalEmail: form.internalEmail,
        contractPrefix: form.contractPrefix,
        rates: { SAR: Number(form.sar) || 0, USD: Number(form.usd) || 0 },
        simulatedToday: form.simulatedToday || null,
        reminderMode: form.reminderMode,
      });
      setSettings(r.data);
      setForm(formOf(r.data));
      toast.success(r.message ?? 'Settings saved');
      void dispatch(collectChanged());
    } catch (e) {
      toast.error(apiError(e, 'Could not save the settings'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel
      title="General"
      action={
        canAdmin ? (
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />} Save
          </Button>
        ) : undefined
      }
    >
      {ro && <ReadOnlyNote />}
      <fieldset disabled={ro} className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Company name" htmlFor="gs-company" hint="Used in templates as {{company}}">
          <input id="gs-company" className={INPUT} value={form.company} onChange={(e) => set('company', e.target.value)} />
        </Field>
        <Field label="Sender e-mail" htmlFor="gs-sender" hint="From address in auto mode">
          <input id="gs-sender" type="email" className={INPUT} value={form.senderEmail} onChange={(e) => set('senderEmail', e.target.value)} />
        </Field>
        <Field label="Internal e-mail" htmlFor="gs-internal" hint="Where internal reminders go">
          <input id="gs-internal" type="email" className={INPUT} value={form.internalEmail} onChange={(e) => set('internalEmail', e.target.value)} />
        </Field>
        <Field label="Contract number prefix" htmlFor="gs-prefix" hint={`Next contract: ${form.contractPrefix}${String(settings.nextContractNo).padStart(4, '0')}`}>
          <input id="gs-prefix" className={INPUT} value={form.contractPrefix} onChange={(e) => set('contractPrefix', e.target.value)} />
        </Field>
        <Field label="Saudi riyal rate (EGP)" htmlFor="gs-sar">
          <input id="gs-sar" type="number" min={0} step="any" className={INPUT} value={form.sar} onChange={(e) => set('sar', e.target.value)} />
        </Field>
        <Field label="US dollar rate (EGP)" htmlFor="gs-usd">
          <input id="gs-usd" type="number" min={0} step="any" className={INPUT} value={form.usd} onChange={(e) => set('usd', e.target.value)} />
        </Field>
        <Field
          label="System date"
          htmlFor="gs-today"
          hint={form.simulatedToday ? 'Simulated date — preview reminders and delays for any day' : `Empty = today’s real date${realToday ? ` (${fmtDate(realToday)})` : ''}`}
        >
          <div className="flex gap-2">
            <input id="gs-today" type="date" className={INPUT} value={form.simulatedToday} onChange={(e) => set('simulatedToday', e.target.value)} />
            {form.simulatedToday && !ro && (
              <Button type="button" variant="outline" onClick={() => set('simulatedToday', '')}>
                Use today’s real date
              </Button>
            )}
          </div>
        </Field>
        <Field label="Reminder mode" htmlFor="gs-mode">
          <Select id="gs-mode" value={form.reminderMode} onChange={(e) => set('reminderMode', e.target.value as Form['reminderMode'])}>
            <option value="manual">Manual — outbox only</option>
            <option value="auto">Automatic — daily send at 08:00</option>
          </Select>
        </Field>
        <Field label="Mail status (SMTP)">
          <div className="flex h-10 items-center">
            {settings.smtpConfigured ? <Chip tone="ok">Mail is configured</Chip> : <Chip tone="warn">Mail is not configured</Chip>}
          </div>
        </Field>
      </fieldset>
      {!form.internalEmail && <Warning>(Internal e-mail not set) — internal reminders reach no one until you set an address.</Warning>}
      {form.reminderMode === 'auto' && !settings.smtpConfigured && (
        <Warning>Auto-send isn’t available because e-mail isn’t configured on the server — reminders stay in the outbox for manual sending.</Warning>
      )}
    </Panel>
  );
}
