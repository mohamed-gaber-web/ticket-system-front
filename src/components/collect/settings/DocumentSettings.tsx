import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Loader2, RotateCcw, Save, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { collectChanged } from '@/redux/slices/collectSlice';
import { getCollectSettings, putCollectSettings } from '@/api/collectApi';
import { DOC_PLACEHOLDERS, apiError } from '@/lib/collect';
import { ErrorState, Field, INPUT, Loading, Panel, Select, TEXTAREA } from '@/components/collect/CollectUi';
import { ClauseLibraryEditor } from './ClauseLibraryEditor';
import { ReadOnlyNote } from './ReadOnlyNote';
import type { CollectSettings, DocumentSettings as Doc } from '@/types/collect.types';

const MAX_BYTES = 1.5 * 1024 * 1024;

const readImage = (file: File) =>
  new Promise<string>((resolve, reject) => {
    if (!/^image\/(png|svg\+xml)$/.test(file.type)) return reject(new Error('صورة PNG أو SVG فقط'));
    if (file.size > MAX_BYTES) return reject(new Error('الحد الأقصى 1.5 ميجابايت'));
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('تعذرت قراءة الصورة'));
    r.readAsDataURL(file);
  });

const TEXT_FIELDS: { key: keyof Doc; label: string; ltr?: boolean; area?: boolean; hint?: string }[] = [
  { key: 'title', label: 'عنوان العقد' },
  { key: 'legalName', label: 'الاسم القانوني للشركة' },
  { key: 'legalForm', label: 'الشكل القانوني' },
  { key: 'cr', label: 'رقم السجل التجاري', ltr: true },
  { key: 'crOffice', label: 'مكتب السجل التجاري' },
  { key: 'taxNo', label: 'الرقم الضريبي', ltr: true },
  { key: 'address', label: 'العنوان' },
  { key: 'signer', label: 'اسم الموقّع' },
  { key: 'signerTitle', label: 'صفة الموقّع' },
];

/** الإعدادات › نموذج العقد PDF (+ the general clause library). */
export function DocumentSettings() {
  const dispatch = useAppDispatch();
  const canAdmin = useAppSelector((s) => !!s.collect.meta?.canAdmin);
  const types = useAppSelector((s) => s.collect.meta?.types ?? []);
  const [settings, setSettings] = useState<CollectSettings | null>(null);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const s = await getCollectSettings();
      setSettings(s);
      setDoc(s.document);
    } catch (e) {
      setError(apiError(e, 'تعذر تحميل الإعدادات'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!doc || !settings) return <Loading rows={6} />;

  const ro = !canAdmin;
  const set = <K extends keyof Doc>(k: K, v: Doc[K]) => setDoc((d) => (d ? { ...d, [k]: v } : d));

  const pickImage = (key: 'logo' | 'mark') => async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      set(key, await readImage(file));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const r = await putCollectSettings({ document: doc });
      setSettings(r.data);
      setDoc(r.data.document);
      toast.success('تم حفظ نموذج العقد');
      void dispatch(collectChanged());
    } catch (e) {
      toast.error(apiError(e, 'تعذر حفظ نموذج العقد'));
    } finally {
      setSaving(false);
    }
  };

  const txt = (key: keyof Doc, label: string, opts: { ltr?: boolean; area?: boolean; rows?: number; hint?: string; className?: string } = {}) => (
    <Field label={label} htmlFor={`ds-${key}`} hint={opts.hint} className={opts.className}>
      {opts.area ? (
        <textarea
          id={`ds-${key}`}
          dir={opts.ltr ? 'ltr' : undefined}
          rows={opts.rows ?? 3}
          className={TEXTAREA}
          value={String(doc[key] ?? '')}
          onChange={(e) => set(key, e.target.value as never)}
        />
      ) : (
        <input id={`ds-${key}`} dir={opts.ltr ? 'ltr' : undefined} className={INPUT} value={String(doc[key] ?? '')} onChange={(e) => set(key, e.target.value as never)} />
      )}
    </Field>
  );

  const imageField = (key: 'logo' | 'mark', label: string, fallback: string) => (
    <Field label={label} htmlFor={`ds-${key}`} hint="PNG أو SVG حتى 1.5 ميجابايت">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid h-14 w-40 place-items-center overflow-hidden rounded-[0.5rem] bg-white p-1.5 ring-1 ring-outline-variant/40">
          <img src={doc[key] || fallback} alt={label} className="max-h-full max-w-full object-contain" />
        </span>
        {!ro && (
          <>
            <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[0.75rem] bg-surface-container-high px-3 text-sm font-semibold hover:bg-surface-container-highest">
              <Upload className="h-4 w-4" /> رفع
              <input id={`ds-${key}`} type="file" accept="image/png,image/svg+xml" className="sr-only" onChange={pickImage(key)} />
            </label>
            {doc[key] && (
              <Button type="button" size="sm" variant="ghost" onClick={() => set(key, null)}>
                <RotateCcw /> {key === 'logo' ? 'استرجاع الشعار الافتراضي' : 'استرجاع العلامة الافتراضية'}
              </Button>
            )}
          </>
        )}
      </div>
    </Field>
  );

  return (
    <div className="space-y-4">
      <Panel
        title="نموذج العقد PDF"
        hint="يُطبع العقد من المتصفح (طباعة ← حفظ كـ PDF) على ورق A4."
        action={
          canAdmin ? (
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />} حفظ
            </Button>
          ) : undefined
        }
      >
        {ro && <ReadOnlyNote />}
        <fieldset disabled={ro} className="min-w-0 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="شكل الورق" htmlFor="ds-paper">
              <Select id="ds-paper" value={doc.paper} onChange={(e) => set('paper', e.target.value as Doc['paper'])}>
                <option value="designed">مصمم — ترويسة Grow Path كاملة</option>
                <option value="preprinted">ورق مطبوع مسبقًا — هوامش فارغة</option>
                <option value="plain">بسيط — ترويسة نصية</option>
              </Select>
            </Field>
            {doc.paper === 'preprinted' && (
              <>
                <Field label="الهامش العلوي (مم)" htmlFor="ds-top">
                  <input id="ds-top" type="number" min={0} max={120} className={INPUT} value={doc.topMm} onChange={(e) => set('topMm', Number(e.target.value))} />
                </Field>
                <Field label="الهامش السفلي (مم)" htmlFor="ds-bottom">
                  <input id="ds-bottom" type="number" min={0} max={120} className={INPUT} value={doc.bottomMm} onChange={(e) => set('bottomMm', Number(e.target.value))} />
                </Field>
              </>
            )}
          </div>

          {doc.paper === 'designed' && (
            <div className="space-y-3 rounded-[0.75rem] bg-surface-container-low p-3">
              <div className="grid gap-3 lg:grid-cols-2">
                {imageField('logo', 'الشعار', '/collect/gp-logo.png')}
                {imageField('mark', 'العلامة المائية', '/collect/gp-mark.png')}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" className="accent-primary" checked={doc.watermark} onChange={(e) => set('watermark', e.target.checked)} />
                إظهار العلامة المائية
              </label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {txt('phone', 'الهاتف (الشريط السفلي)', { ltr: true })}
                {txt('email', 'البريد (الشريط السفلي)', { ltr: true })}
                {txt('web', 'الموقع (الشريط السفلي)', { ltr: true })}
                {txt('footAddr', 'العنوان (الشريط السفلي)', { ltr: true, area: true })}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TEXT_FIELDS.map((f) => txt(f.key, f.label, { ltr: f.ltr }))}
          </div>

          <div className="space-y-3 rounded-[0.75rem] bg-surface-container-low p-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" className="accent-primary" checked={doc.showVat} onChange={(e) => set('showVat', e.target.checked)} />
              إظهار جدول ضريبة القيمة المضافة في بند قيمة العقد
            </label>
            {doc.showVat && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="نسبة الضريبة — مصر %" htmlFor="ds-vateg">
                  <input id="ds-vateg" type="number" min={0} max={100} step="any" className={INPUT} value={doc.vatEG} onChange={(e) => set('vatEG', Number(e.target.value))} />
                </Field>
                <Field label="نسبة الضريبة — السعودية %" htmlFor="ds-vatsa">
                  <input id="ds-vatsa" type="number" min={0} max={100} step="any" className={INPUT} value={doc.vatSA} onChange={(e) => set('vatSA', Number(e.target.value))} />
                </Field>
              </div>
            )}
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {txt('bank', 'بيانات الحساب البنكي', { area: true, rows: 4, hint: 'تظهر كبند فرعي في جدول الدفعات إن وُجدت' })}
            {txt('preamble', 'التمهيد', { area: true, rows: 4, hint: 'فقرة لكل سطر' })}
            {txt('payTerms', 'شروط السداد العامة', { area: true, rows: 5, hint: 'سطر لكل شرط' })}
            {txt('usdTerm', 'شرط العقود بالدولار', { area: true, rows: 3, hint: 'يُضاف تلقائيًا لعقود الدولار' })}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {txt('lawEG', 'القانون الحاكم — مصر')}
            {txt('courtEG', 'جهة النزاع — مصر')}
            {txt('lawSA', 'القانون الحاكم — السعودية')}
            {txt('courtSA', 'جهة النزاع — السعودية')}
          </div>
          <p className="text-[11px] text-on-surface-variant">
            المتغيرات في نصوص العقد: {DOC_PLACEHOLDERS.map((p) => `{{${p}}}`).join(' · ')} — القانون وجهة النزاع السعودية تُطبق على عملاء السعودية تلقائيًا.
          </p>
        </fieldset>
      </Panel>

      <ClauseLibraryEditor initial={settings.clauses} types={types} readOnly={ro} onSaved={setSettings} />
    </div>
  );
}
