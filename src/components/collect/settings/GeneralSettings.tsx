import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { collectChanged } from '@/redux/slices/collectSlice';
import { getCollectSettings, putCollectSettings } from '@/api/collectApi';
import { apiError, arDate } from '@/lib/collect';
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

/** الإعدادات › عام */
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
      setError(apiError(e, 'تعذر تحميل الإعدادات'));
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
      toast.success(r.message ?? 'تم حفظ الإعدادات');
      void dispatch(collectChanged());
    } catch (e) {
      toast.error(apiError(e, 'تعذر حفظ الإعدادات'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel
      title="عام"
      action={
        canAdmin ? (
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />} حفظ
          </Button>
        ) : undefined
      }
    >
      {ro && <ReadOnlyNote />}
      <fieldset disabled={ro} className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="اسم الشركة" htmlFor="gs-company" hint="يُستخدم في القوالب {{الشركة}}">
          <input id="gs-company" className={INPUT} value={form.company} onChange={(e) => set('company', e.target.value)} />
        </Field>
        <Field label="بريد المرسل" htmlFor="gs-sender" hint="عنوان الإرسال في وضع الإرسال التلقائي">
          <input id="gs-sender" dir="ltr" type="email" className={INPUT} value={form.senderEmail} onChange={(e) => set('senderEmail', e.target.value)} />
        </Field>
        <Field label="البريد الداخلي" htmlFor="gs-internal" hint="تصل إليه التذكيرات الداخلية">
          <input id="gs-internal" dir="ltr" type="email" className={INPUT} value={form.internalEmail} onChange={(e) => set('internalEmail', e.target.value)} />
        </Field>
        <Field label="بادئة رقم العقد" htmlFor="gs-prefix" hint={`العقد القادم: ${form.contractPrefix}${String(settings.nextContractNo).padStart(4, '0')}`}>
          <input id="gs-prefix" dir="ltr" className={INPUT} value={form.contractPrefix} onChange={(e) => set('contractPrefix', e.target.value)} />
        </Field>
        <Field label="سعر الريال السعودي (ج.م)" htmlFor="gs-sar">
          <input id="gs-sar" type="number" min={0} step="any" className={INPUT} value={form.sar} onChange={(e) => set('sar', e.target.value)} />
        </Field>
        <Field label="سعر الدولار الأمريكي (ج.م)" htmlFor="gs-usd">
          <input id="gs-usd" type="number" min={0} step="any" className={INPUT} value={form.usd} onChange={(e) => set('usd', e.target.value)} />
        </Field>
        <Field
          label="تاريخ اليوم في النظام"
          htmlFor="gs-today"
          hint={form.simulatedToday ? 'تاريخ محاكاة — لمعاينة التذكيرات والتأخيرات في أي يوم' : `فارغ = تاريخ اليوم الفعلي${realToday ? ` (${arDate(realToday)})` : ''}`}
        >
          <div className="flex gap-2">
            <input id="gs-today" type="date" className={INPUT} value={form.simulatedToday} onChange={(e) => set('simulatedToday', e.target.value)} />
            {form.simulatedToday && !ro && (
              <Button type="button" variant="outline" onClick={() => set('simulatedToday', '')}>
                استخدام تاريخ اليوم الفعلي
              </Button>
            )}
          </div>
        </Field>
        <Field label="وضع التذكيرات" htmlFor="gs-mode">
          <Select id="gs-mode" value={form.reminderMode} onChange={(e) => set('reminderMode', e.target.value as Form['reminderMode'])}>
            <option value="manual">يدوي — صندوق الصادر فقط</option>
            <option value="auto">تلقائي — إرسال يومي الساعة 8 صباحًا</option>
          </Select>
        </Field>
        <Field label="حالة البريد (SMTP)">
          <div className="flex h-10 items-center">
            {settings.smtpConfigured ? <Chip tone="ok">البريد مُعد للإرسال</Chip> : <Chip tone="warn">البريد غير مُعد</Chip>}
          </div>
        </Field>
      </fieldset>
      {!form.internalEmail && <Warning>(البريد الداخلي غير محدد) — التذكيرات الداخلية لن تصل لأحد حتى تحدد بريدًا.</Warning>}
      {form.reminderMode === 'auto' && !settings.smtpConfigured && (
        <Warning>الإرسال التلقائي غير متاح لأن البريد غير مُعد على الخادم — ستبقى التذكيرات في صندوق الصادر للإرسال اليدوي.</Warning>
      )}
    </Panel>
  );
}
