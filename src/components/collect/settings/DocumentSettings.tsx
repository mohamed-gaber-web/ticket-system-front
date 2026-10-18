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
    if (!/^image\/(png|svg\+xml)$/.test(file.type)) return reject(new Error('PNG or SVG images only'));
    if (file.size > MAX_BYTES) return reject(new Error('Maximum 1.5 MB'));
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Could not read the image'));
    r.readAsDataURL(file);
  });

const TEXT_FIELDS: { key: keyof Doc; label: string; area?: boolean; hint?: string }[] = [
  { key: 'title', label: 'Contract title' },
  { key: 'legalName', label: 'Company legal name' },
  { key: 'legalForm', label: 'Legal form' },
  { key: 'cr', label: 'Commercial registration no.' },
  { key: 'crOffice', label: 'Commercial registry office' },
  { key: 'taxNo', label: 'Tax ID' },
  { key: 'address', label: 'Address' },
  { key: 'signer', label: 'Signatory name' },
  { key: 'signerTitle', label: 'Signatory title' },
];

/** Settings › Contract PDF template (+ the general clause library). */
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
      setError(apiError(e, 'Could not load the settings'));
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
      toast.success('Contract template saved');
      void dispatch(collectChanged());
    } catch (e) {
      toast.error(apiError(e, 'Could not save the contract template'));
    } finally {
      setSaving(false);
    }
  };

  const txt = (key: keyof Doc, label: string, opts: { area?: boolean; rows?: number; hint?: string; className?: string } = {}) => (
    <Field label={label} htmlFor={`ds-${key}`} hint={opts.hint} className={opts.className}>
      {opts.area ? (
        <textarea
          id={`ds-${key}`}
          rows={opts.rows ?? 3}
          className={TEXTAREA}
          value={String(doc[key] ?? '')}
          onChange={(e) => set(key, e.target.value as never)}
        />
      ) : (
        <input id={`ds-${key}`} className={INPUT} value={String(doc[key] ?? '')} onChange={(e) => set(key, e.target.value as never)} />
      )}
    </Field>
  );

  const imageField = (key: 'logo' | 'mark', label: string, fallback: string) => (
    <Field label={label} htmlFor={`ds-${key}`} hint="PNG or SVG, up to 1.5 MB">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid h-14 w-40 place-items-center overflow-hidden rounded-[0.5rem] bg-white p-1.5 ring-1 ring-outline-variant/40">
          <img src={doc[key] || fallback} alt={label} className="max-h-full max-w-full object-contain" />
        </span>
        {!ro && (
          <>
            <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[0.75rem] bg-surface-container-high px-3 text-sm font-semibold hover:bg-surface-container-highest">
              <Upload className="h-4 w-4" /> Upload
              <input id={`ds-${key}`} type="file" accept="image/png,image/svg+xml" className="sr-only" onChange={pickImage(key)} />
            </label>
            {doc[key] && (
              <Button type="button" size="sm" variant="ghost" onClick={() => set(key, null)}>
                <RotateCcw /> {key === 'logo' ? 'Restore default logo' : 'Restore default mark'}
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
        title="Contract PDF template"
        hint="The contract is printed from the browser (Print → Save as PDF) on A4 paper."
        action={
          canAdmin ? (
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />} Save
            </Button>
          ) : undefined
        }
      >
        {ro && <ReadOnlyNote />}
        <fieldset disabled={ro} className="min-w-0 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Paper" htmlFor="ds-paper">
              <Select id="ds-paper" value={doc.paper} onChange={(e) => set('paper', e.target.value as Doc['paper'])}>
                <option value="designed">Designed — full Grow Path letterhead</option>
                <option value="preprinted">Pre-printed paper — blank margins</option>
                <option value="plain">Plain — text letterhead</option>
              </Select>
            </Field>
            {doc.paper === 'preprinted' && (
              <>
                <Field label="Top margin (mm)" htmlFor="ds-top">
                  <input id="ds-top" type="number" min={0} max={120} className={INPUT} value={doc.topMm} onChange={(e) => set('topMm', Number(e.target.value))} />
                </Field>
                <Field label="Bottom margin (mm)" htmlFor="ds-bottom">
                  <input id="ds-bottom" type="number" min={0} max={120} className={INPUT} value={doc.bottomMm} onChange={(e) => set('bottomMm', Number(e.target.value))} />
                </Field>
              </>
            )}
          </div>

          {doc.paper === 'designed' && (
            <div className="space-y-3 rounded-[0.75rem] bg-surface-container-low p-3">
              <div className="grid gap-3 lg:grid-cols-2">
                {imageField('logo', 'Logo', '/collect/gp-logo.png')}
                {imageField('mark', 'Watermark', '/collect/gp-mark.png')}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" className="accent-primary" checked={doc.watermark} onChange={(e) => set('watermark', e.target.checked)} />
                Show watermark
              </label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {txt('phone', 'Phone (footer band)')}
                {txt('email', 'E-mail (footer band)')}
                {txt('web', 'Website (footer band)')}
                {txt('footAddr', 'Address (footer band)', { area: true })}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TEXT_FIELDS.map((f) => txt(f.key, f.label))}
          </div>

          <div className="space-y-3 rounded-[0.75rem] bg-surface-container-low p-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" className="accent-primary" checked={doc.showVat} onChange={(e) => set('showVat', e.target.checked)} />
              Show the VAT table in the contract value clause
            </label>
            {doc.showVat && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="VAT — Egypt %" htmlFor="ds-vateg">
                  <input id="ds-vateg" type="number" min={0} max={100} step="any" className={INPUT} value={doc.vatEG} onChange={(e) => set('vatEG', Number(e.target.value))} />
                </Field>
                <Field label="VAT — Saudi Arabia %" htmlFor="ds-vatsa">
                  <input id="ds-vatsa" type="number" min={0} max={100} step="any" className={INPUT} value={doc.vatSA} onChange={(e) => set('vatSA', Number(e.target.value))} />
                </Field>
              </div>
            )}
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {txt('bank', 'Bank account details', { area: true, rows: 4, hint: 'Printed as a sub-item of the payment clause when set' })}
            {txt('preamble', 'Preamble', { area: true, rows: 4, hint: 'One paragraph per line' })}
            {txt('payTerms', 'General payment terms', { area: true, rows: 5, hint: 'One term per line' })}
            {txt('usdTerm', 'USD contracts term', { area: true, rows: 3, hint: 'Added automatically to USD contracts' })}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {txt('lawEG', 'Governing law — Egypt')}
            {txt('courtEG', 'Dispute venue — Egypt')}
            {txt('lawSA', 'Governing law — Saudi Arabia')}
            {txt('courtSA', 'Dispute venue — Saudi Arabia')}
          </div>
          <p className="text-[11px] text-on-surface-variant">
            Placeholders in contract text: {DOC_PLACEHOLDERS.map((p) => `{{${p}}}`).join(' · ')} — the Saudi law and venue apply to Saudi customers automatically.
          </p>
        </fieldset>
      </Panel>

      <ClauseLibraryEditor initial={settings.clauses} types={types} readOnly={ro} onSaved={setSettings} />
    </div>
  );
}
