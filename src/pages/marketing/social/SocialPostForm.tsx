import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Pencil, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAccess } from '@/redux/hooks/useAccess';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchSocialPost, socialChanged } from '@/redux/slices/socialSlice';
import { createSocialPost, deleteSocialSnapshot, putSocialSnapshot, updateSocialPost } from '@/api/socialApi';
import { SOCIAL_BASE, SocialLayout } from '@/components/social/SocialLayout';
import { Field, GOOD_TEXT, NativeSelect, Pill, TableBox, TD, TD_NUM, TH } from '@/components/social/SocialUi';
import { ConfirmButton, ErrorState, LoadingRows, Panel } from '@/components/vault/VaultUi';
import {
  CONTENT_TYPES,
  CONTENT_TYPE_LABELS,
  METRIC_FIELDS,
  METRIC_FIELD_LABELS,
  PLATFORMS,
  PLATFORM_LABELS,
  apiError,
  fmtDay,
  fmtMoney,
  fmtNumber,
  fmtPercent,
  monthLabel,
  monthOf,
  sumsOf,
} from '@/lib/socialPulse';
import type { ContentType, MetricField, MetricValues, Platform, SocialPost, SocialSnapshot } from '@/types/social.types';

type Inputs = Record<MetricField, string>;

const blankInputs = (): Inputs => Object.fromEntries(METRIC_FIELDS.map((k) => [k, ''])) as Inputs;

const inputsFrom = (s: Partial<MetricValues> | null | undefined): Inputs =>
  Object.fromEntries(METRIC_FIELDS.map((k) => [k, s?.[k] == null ? '' : String(s[k])])) as Inputs;

const valuesFrom = (inputs: Inputs): MetricValues =>
  Object.fromEntries(METRIC_FIELDS.map((k) => [k, inputs[k].trim() === '' ? null : Number(inputs[k])])) as MetricValues;

const snapshotAt = (snaps: SocialSnapshot[], m: string) => snaps.find((s) => s.month === m) ?? null;
const latestUpTo = (snaps: SocialSnapshot[], m: string) => [...snaps].reverse().find((s) => s.month <= m) ?? null;

interface Meta {
  title: string;
  platform: Platform | '';
  type: ContentType;
  category: string;
  publishDate: string;
  boosted: boolean;
  link: string;
  notes: string;
}

const EMPTY_META: Meta = { title: '', platform: '', type: 'reel', category: '', publishDate: '', boosted: false, link: '', notes: '' };

const metaFrom = (p: SocialPost): Meta => ({
  title: p.title,
  platform: p.platform,
  type: p.type,
  category: p.category,
  publishDate: p.publishDate,
  boosted: p.boosted,
  link: p.link,
  notes: p.notes,
});

function CalcTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[0.75rem] bg-surface-container-low p-3">
      <p className="text-[11px] font-semibold text-on-surface-variant">{label}</p>
      <p className="text-lg font-extrabold tabular-nums text-on-surface">{value}</p>
    </div>
  );
}

/** New post (`/posts/new`) and Update post + monthly history (`/posts/:id`) — §7.6. */
export default function SocialPostForm() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { canWriteSocial } = useAccess();
  const meta = useAppSelector((s) => s.social.meta);
  const detail = useAppSelector((s) => (id ? s.social.postById[id] : undefined));
  const postStatus = useAppSelector((s) => s.social.postStatus);
  const postError = useAppSelector((s) => s.social.postError);

  const currentMonth = meta?.currentMonth ?? new Date().toISOString().slice(0, 7);
  const [form, setForm] = useState<Meta>(EMPTY_META);
  const [month, setMonthValue] = useState('');
  const [inputs, setInputs] = useState<Inputs>(blankInputs);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<null | 'save' | 'another'>(null);
  const loadedFor = useRef<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const readOnly = !canWriteSocial;

  useEffect(() => {
    if (id) void dispatch(fetchSocialPost(id));
  }, [dispatch, id]);

  // New post: the pull month defaults to the current month once meta arrives.
  useEffect(() => {
    if (isNew && !month && meta) setMonthValue(meta.currentMonth);
  }, [isNew, month, meta]);

  // Existing post: fill the form once per post (later refetches keep the user's edits).
  useEffect(() => {
    if (!detail || loadedFor.current === detail.post.id) return;
    loadedFor.current = detail.post.id;
    const p = detail.post;
    setForm(metaFrom(p));
    const m = p.latestMonth && p.latestMonth > currentMonth ? p.latestMonth : currentMonth;
    setMonthValue(m);
    setInputs(inputsFrom(snapshotAt(p.snapshots, m) ?? latestUpTo(p.snapshots, m)));
  }, [detail, currentMonth]);

  const snaps = detail?.post.snapshots ?? [];
  const existingMonth = !isNew && !!month && snaps.some((s) => s.month === month);
  const prevForHint = !isNew && month ? latestUpTo(snaps, month) : null;

  const changeMonth = (m: string) => {
    setMonthValue(m);
    if (!isNew && m) setInputs(inputsFrom(snapshotAt(snaps, m) ?? latestUpTo(snaps, m)));
  };

  const set = <K extends keyof Meta>(key: K, value: Meta[K]) => setForm((f) => ({ ...f, [key]: value }));

  const calc = useMemo(() => {
    const s = sumsOf(valuesFrom(inputs));
    return {
      eng: fmtNumber(s.eng),
      er: fmtPercent(s.reach > 0 ? s.eng / s.reach : null),
      ctr: fmtPercent(s.impressions > 0 ? s.clicks / s.impressions : null),
      cpl: fmtMoney(s.spend > 0 && s.leads > 0 ? s.spend / s.leads : null),
    };
  }, [inputs]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Enter a post title';
    if (!form.platform) e.platform = 'Pick a platform';
    if (!form.publishDate) e.publishDate = 'Pick a publish date';
    if (!month) e.month = 'Pick a pull month';
    else if (form.publishDate && month < monthOf(form.publishDate)) e.month = "The pull month can't be before the publish month";
    for (const k of METRIC_FIELDS) {
      const v = inputs[k].trim();
      if (v !== '' && !(Number(v) >= 0)) e[k] = 'A number of 0 or more';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const metaBody = () => ({
    title: form.title.trim(),
    platform: form.platform as Platform,
    type: form.type,
    category: form.category.trim(),
    publishDate: form.publishDate,
    boosted: form.boosted,
    link: form.link.trim(),
    notes: form.notes,
  });

  const saveError = (e: unknown) => {
    const status = (e as { response?: { status?: number } })?.response?.status;
    toast.error(status === 400 || status === 403 ? apiError(e, "Couldn't save.") : "Couldn't save. Check your connection and press Save again.");
  };

  const submit = async (mode: 'save' | 'another', ev?: FormEvent) => {
    ev?.preventDefault();
    if (readOnly || saving || !validate()) return;
    setSaving(mode);
    try {
      if (isNew) {
        await createSocialPost({ ...metaBody(), snapshot: { month, ...valuesFrom(inputs) } });
        void dispatch(socialChanged());
        toast.success(`Saved "${form.title.trim()}"`);
        if (mode === 'another') {
          setForm((f) => ({ ...EMPTY_META, platform: f.platform, type: f.type, category: f.category, publishDate: f.publishDate }));
          setInputs(blankInputs());
          setErrors({});
          titleRef.current?.focus();
        } else {
          navigate(`${SOCIAL_BASE}/posts`);
        }
      } else if (id) {
        await updateSocialPost(id, metaBody());
        await putSocialSnapshot(id, month, valuesFrom(inputs));
        await dispatch(fetchSocialPost(id));
        void dispatch(socialChanged());
        toast.success(`Saved the ${monthLabel(month)} numbers`);
      }
    } catch (e) {
      saveError(e);
    } finally {
      setSaving(null);
    }
  };

  const removeMonth = async (m: string) => {
    if (!id) return;
    try {
      const fresh = await deleteSocialSnapshot(id, m);
      await dispatch(fetchSocialPost(id));
      void dispatch(socialChanged());
      // The form showed the deleted month: refill it from what is left.
      if (m === month) setInputs(inputsFrom(latestUpTo(fresh.post.snapshots, m)));
      toast.success(`${monthLabel(m)} deleted`);
    } catch (e) {
      toast.error(apiError(e, 'Could not delete that month'));
    }
  };

  if (isNew && readOnly) return <Navigate to={`${SOCIAL_BASE}/posts`} replace />;

  if (!isNew && !detail) {
    return (
      <SocialLayout title="Post">
        {postStatus === 'failed' ? (
          <ErrorState message={postError ?? 'Could not load the post'} onRetry={() => id && void dispatch(fetchSocialPost(id))} />
        ) : (
          <LoadingRows rows={4} />
        )}
      </SocialLayout>
    );
  }

  const hint = isNew
    ? 'First pull for this post. Enter the numbers as they stand today.'
    : existingMonth
      ? `A reading for ${monthLabel(month)} already exists and will be updated.`
      : `New reading for ${monthLabel(month)}. The boxes show the last numbers (${prevForHint ? monthLabel(prevForHint.month) : '—'}); replace them with today's.`;

  const err = (k: string) =>
    errors[k] ? (
      <p role="alert" className="text-[11px] font-semibold text-error">
        {errors[k]}
      </p>
    ) : null;

  return (
    <SocialLayout
      title={isNew ? 'New post' : readOnly ? 'Post' : 'Update post'}
      description={isNew ? undefined : form.title}
      actions={
        !isNew ? (
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft /> Back
          </Button>
        ) : undefined
      }
    >
      <form onSubmit={(e) => void submit('save', e)} noValidate className="space-y-4">
        <fieldset disabled={readOnly || !!saving} className="min-w-0 space-y-4">
          <Panel title="Post">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Post title *" htmlFor="sp-title" className="sm:col-span-2 lg:col-span-3">
                <Input
                  id="sp-title"
                  ref={titleRef}
                  dir="auto"
                  value={form.title}
                  maxLength={200}
                  onChange={(e) => set('title', e.target.value)}
                  aria-invalid={!!errors.title}
                />
                {err('title')}
              </Field>
              <Field label="Platform *" htmlFor="sp-platform">
                <NativeSelect id="sp-platform" value={form.platform} onChange={(e) => set('platform', e.target.value as Platform)} aria-invalid={!!errors.platform}>
                  <option value="">Pick a platform</option>
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {PLATFORM_LABELS[p]}
                    </option>
                  ))}
                </NativeSelect>
                {err('platform')}
              </Field>
              <Field label="Content type" htmlFor="sp-type">
                <NativeSelect id="sp-type" value={form.type} onChange={(e) => set('type', e.target.value as ContentType)}>
                  {CONTENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {CONTENT_TYPE_LABELS[t]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Category / series" htmlFor="sp-category">
                <Input id="sp-category" dir="auto" list="sp-categories" value={form.category} maxLength={100} onChange={(e) => set('category', e.target.value)} />
                <datalist id="sp-categories">
                  {(meta?.categories ?? []).map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
              <Field label="Publish date *" htmlFor="sp-date">
                <Input id="sp-date" type="date" value={form.publishDate} onChange={(e) => set('publishDate', e.target.value)} aria-invalid={!!errors.publishDate} />
                {err('publishDate')}
              </Field>
              <Field label="Paid?" htmlFor="sp-paid">
                <NativeSelect id="sp-paid" value={form.boosted ? 'paid' : 'organic'} onChange={(e) => set('boosted', e.target.value === 'paid')}>
                  <option value="organic">Organic</option>
                  <option value="paid">Paid / boosted</option>
                </NativeSelect>
              </Field>
              <Field label="Post link" htmlFor="sp-link">
                <Input id="sp-link" dir="ltr" type="url" value={form.link} maxLength={1000} placeholder="https://" onChange={(e) => set('link', e.target.value)} />
              </Field>
            </div>
          </Panel>

          <Panel title="Numbers for the pull month">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Pull month *" htmlFor="sp-month" hint={month ? hint : undefined}>
                <Input id="sp-month" type="month" value={month} onChange={(e) => changeMonth(e.target.value)} aria-invalid={!!errors.month} />
                {err('month')}
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {METRIC_FIELDS.map((k) => (
                <Field key={k} label={METRIC_FIELD_LABELS[k]} htmlFor={`sp-m-${k}`}>
                  <Input
                    id={`sp-m-${k}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    className="tabular-nums"
                    value={inputs[k]}
                    placeholder="—"
                    onChange={(e) => setInputs((v) => ({ ...v, [k]: e.target.value }))}
                    aria-invalid={!!errors[k]}
                  />
                  {err(k)}
                </Field>
              ))}
            </div>
            <p className="text-[11px] text-on-surface-variant">Leave a box blank when the platform doesn't show that number.</p>
            <Field label="Notes" htmlFor="sp-notes">
              <Textarea id="sp-notes" dir="auto" rows={2} maxLength={2000} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </Field>
          </Panel>
        </fieldset>

        <Panel title="Calculated (cumulative up to this month)">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <CalcTile label="Engagement" value={calc.eng} />
            <CalcTile label="Engagement rate" value={calc.er} />
            <CalcTile label="CTR" value={calc.ctr} />
            <CalcTile label="Cost per lead" value={calc.cpl} />
          </div>
        </Panel>

        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!!saving}>
              {saving === 'save' ? <Loader2 className="animate-spin" /> : <Save />} Save
            </Button>
            {isNew && (
              <Button type="button" variant="outline" disabled={!!saving} onClick={() => void submit('another')}>
                {saving === 'another' && <Loader2 className="animate-spin" />} Save and add another
              </Button>
            )}
            {isNew && (
              <Button asChild variant="ghost">
                <Link to={`${SOCIAL_BASE}/posts`}>Cancel</Link>
              </Button>
            )}
          </div>
        )}
      </form>

      {!isNew && detail && (
        <Panel title="Monthly history">
          <TableBox className="bg-transparent">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-outline-variant/40">
                <tr>
                  <th className={TH}>Month</th>
                  <th className={cn(TH, 'text-right')}>Reach</th>
                  <th className={cn(TH, 'text-right')}>Engagement</th>
                  <th className={cn(TH, 'text-right')}>Engagement gain</th>
                  <th className={cn(TH, 'text-right')}>Eng. rate</th>
                  <th className={cn(TH, 'text-right')}>Clicks</th>
                  <th className={cn(TH, 'text-right')}>Leads</th>
                  {!readOnly && (
                    <th className={TH}>
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {detail.history.map((h) => (
                  <tr key={h.month} className={cn(h.month === month && 'bg-primary/5')}>
                    <td className={TD}>
                      <p className="font-semibold text-on-surface">{monthLabel(h.month)}</p>
                      <p className="text-[11px] text-on-surface-variant">
                        Pulled {fmtDay(h.pulledAt)}
                        {h.source !== 'manual' && ` · ${h.source}`}
                      </p>
                    </td>
                    <td className={TD_NUM}>{fmtNumber(h.values.reach)}</td>
                    <td className={TD_NUM}>{fmtNumber(h.engagement)}</td>
                    <td className={TD_NUM}>
                      {h.engagementGain == null ? (
                        <Pill>First pull</Pill>
                      ) : (
                        <span className={cn('font-semibold', GOOD_TEXT)}>+{fmtNumber(Math.max(0, h.engagementGain))}</span>
                      )}
                    </td>
                    <td className={TD_NUM}>{fmtPercent(h.er)}</td>
                    <td className={TD_NUM}>{fmtNumber(h.values.clicks)}</td>
                    <td className={TD_NUM}>{fmtNumber(h.values.leads)}</td>
                    {!readOnly && (
                      <td className={cn(TD, 'text-right')}>
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              changeMonth(h.month);
                              document.getElementById('sp-month')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                          >
                            <Pencil /> Edit
                          </Button>
                          {detail.history.length > 1 && (
                            <ConfirmButton onConfirm={() => removeMonth(h.month)} ariaLabel={`Delete ${monthLabel(h.month)}`} />
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </TableBox>
        </Panel>
      )}
    </SocialLayout>
  );
}
