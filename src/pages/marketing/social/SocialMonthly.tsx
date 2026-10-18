import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccess } from '@/redux/hooks/useAccess';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { socialChanged } from '@/redux/slices/socialSlice';
import { getSocialBatch, saveSocialBatch } from '@/api/socialApi';
import { SOCIAL_BASE, SocialLayout } from '@/components/social/SocialLayout';
import { ImportPanel } from '@/components/social/ImportPanel';
import { FilterBar, Pill, PlatformDot, TableBox, TD, TH } from '@/components/social/SocialUi';
import { EmptyState, ErrorState, LoadingRows, Panel } from '@/components/vault/VaultUi';
import { METRIC_FIELDS, METRIC_FIELD_LABELS, apiError, fmtDay, monthLabel } from '@/lib/socialPulse';
import type { MetricField, MetricValues, SocialBatch } from '@/types/social.types';

type RowInputs = Record<MetricField, string>;

const toInputs = (v: MetricValues): RowInputs =>
  Object.fromEntries(METRIC_FIELDS.map((k) => [k, v[k] == null ? '' : String(v[k])])) as RowInputs;

const toValues = (r: RowInputs): MetricValues =>
  Object.fromEntries(METRIC_FIELDS.map((k) => [k, r[k].trim() === '' ? null : Number(r[k])])) as MetricValues;

const UNSAVED = 'You have unsaved changes. Save first, or change the month again to discard them.';

/** Monthly pull (§7.5): pick the pull month, then import a file or type the numbers in the grid. */
export default function SocialMonthly() {
  const dispatch = useAppDispatch();
  const { canWriteSocial } = useAccess();
  const meta = useAppSelector((s) => s.social.meta);
  const filters = useAppSelector((s) => s.social.ui.filters);
  const dataVersion = useAppSelector((s) => s.social.dataVersion);

  const [month, setMonth] = useState('');
  const [batch, setBatch] = useState<SocialBatch | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // postId → the edited inputs (only rows that differ from the prefill)
  const [dirty, setDirty] = useState<Record<string, RowInputs>>({});
  const [warned, setWarned] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!month && meta) setMonth(meta.currentMonth);
  }, [month, meta]);

  const load = useCallback(async () => {
    if (!month) return;
    setLoading(true);
    setError(null);
    try {
      setBatch(await getSocialBatch(month, filters));
    } catch (e) {
      setError(apiError(e, 'Could not load the monthly pull'));
    } finally {
      setLoading(false);
    }
  }, [month, filters]);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  const prefill = useMemo(() => {
    const map: Record<string, RowInputs> = {};
    for (const r of batch?.rows ?? []) map[r.post.id] = toInputs(r.prefill);
    return map;
  }, [batch]);

  const dirtyCount = Object.keys(dirty).length;

  const changeMonth = (m: string) => {
    if (!m) return;
    if (dirtyCount > 0 && !warned) {
      setWarned(true);
      toast.warning(UNSAVED);
      return;
    }
    setDirty({});
    setWarned(false);
    setMonth(m);
  };

  const edit = (postId: string, field: MetricField, value: string) => {
    setDirty((prev) => {
      const base = prefill[postId];
      const row = { ...(prev[postId] ?? base), [field]: value };
      const changed = METRIC_FIELDS.some((k) => row[k].trim() !== base[k].trim());
      const next = { ...prev };
      if (changed) next[postId] = row;
      else delete next[postId];
      return next;
    });
  };

  const save = async () => {
    const entries = Object.entries(dirty);
    const bad = entries.find(([, r]) => METRIC_FIELDS.some((k) => r[k].trim() !== '' && !(Number(r[k]) >= 0)));
    if (bad) {
      toast.error('Numbers must be 0 or more. Fix the highlighted row and save again.');
      return;
    }
    setSaving(true);
    try {
      const res = await saveSocialBatch(
        month,
        entries.map(([postId, r]) => ({ postId, values: toValues(r) })),
      );
      if (res.failed.length === 0) toast.success(`Saved ${res.saved} post${res.saved === 1 ? '' : 's'} for ${monthLabel(month)}`);
      else toast.error(`Saved ${res.saved}, ${res.failed.length} failed. Try again for the rest`);
      const failedIds = new Set(res.failed.map((f) => f.postId));
      setDirty((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => failedIds.has(id))));
      setWarned(false);
      void dispatch(socialChanged());
    } catch (e) {
      toast.error(apiError(e, "Couldn't save. Check your connection and press Save again."));
    } finally {
      setSaving(false);
    }
  };

  if (!canWriteSocial) return <Navigate to={SOCIAL_BASE} replace />;

  return (
    <SocialLayout title="Monthly pull" description="Record this month's numbers for every post — old posts keep gaining, so they get a new reading too.">
      <Panel>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="sp-pull-month" className="text-xs font-semibold text-on-surface-variant">
              Pull month
            </label>
            <Input id="sp-pull-month" type="month" value={month} onChange={(e) => changeMonth(e.target.value)} className="w-48" />
          </div>
          {batch && (
            <p className="pb-2 text-sm font-semibold text-on-surface" aria-live="polite">
              {monthLabel(batch.month)}: {batch.pulledCount} of {batch.eligibleCount} posts pulled
            </p>
          )}
        </div>
      </Panel>

      {month && <ImportPanel month={month} onImported={() => void dispatch(socialChanged())} />}

      <Panel
        title="Or enter numbers for every post"
        action={
          <Button type="button" onClick={() => void save()} disabled={dirtyCount === 0 || saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />} Save pull ({dirtyCount} post{dirtyCount === 1 ? '' : 's'})
          </Button>
        }
      >
        <p className="-mt-1 text-sm text-on-surface-variant">
          Each box shows the post's last known value. Type the new cumulative numbers as they appear in Insights today and the system works out the gain.
          Only rows you change are saved.
        </p>
        <FilterBar />
        {error && !batch ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : !batch ? (
          <LoadingRows rows={4} />
        ) : batch.rows.length === 0 ? (
          <EmptyState title="No posts published by this month" hint="Posts appear here from the month they were published." />
        ) : (
          <TableBox className={cn('max-h-[36rem] overflow-y-auto bg-surface-container-low', loading && 'opacity-60')}>
            <table className="w-full min-w-[1400px] text-sm">
              <thead className="sticky top-0 z-[2] bg-surface-container-low">
                <tr className="border-b border-outline-variant/40">
                  <th className={cn(TH, 'sticky left-0 z-[3] bg-surface-container-low')}>Post</th>
                  <th className={TH}>This month</th>
                  {METRIC_FIELDS.map((k) => (
                    <th key={k} className={cn(TH, 'text-right')}>
                      {METRIC_FIELD_LABELS[k]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {batch.rows.map((r) => {
                  const base = prefill[r.post.id];
                  const row = dirty[r.post.id] ?? base;
                  const isDirty = !!dirty[r.post.id];
                  return (
                    <tr key={r.post.id} className={cn(isDirty && 'bg-accent-orange-500/5')}>
                      <td className={cn(TD, 'sticky left-0 z-[1] min-w-[15rem] max-w-[18rem]', isDirty ? 'bg-accent-orange-50 dark:bg-surface-container-high' : 'bg-surface-container-low')}>
                        <p dir="auto" className="line-clamp-2 font-semibold text-on-surface">
                          {r.post.title}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                          <PlatformDot platform={r.post.platform} /> {fmtDay(r.post.publishDate)}
                        </p>
                      </td>
                      <td className={cn(TD, 'whitespace-nowrap')}>
                        <Pill tone={r.status === 'pulled' ? 'ok' : 'warn'}>{r.status === 'pulled' ? 'Pulled' : 'Not pulled'}</Pill>
                        {r.status === 'notPulled' && r.baseMonth && (
                          <p className="mt-0.5 text-[11px] text-on-surface-variant">Last: {monthLabel(r.baseMonth)}</p>
                        )}
                      </td>
                      {METRIC_FIELDS.map((k) => {
                        const changed = isDirty && row[k].trim() !== base[k].trim();
                        const invalid = row[k].trim() !== '' && !(Number(row[k]) >= 0);
                        return (
                          <td key={k} className="px-1.5 py-2 align-top">
                            <input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step="any"
                              value={row[k]}
                              placeholder="—"
                              aria-label={`${METRIC_FIELD_LABELS[k]} — ${r.post.title}`}
                              aria-invalid={invalid}
                              onChange={(e) => edit(r.post.id, k, e.target.value)}
                              className={cn(
                                'h-9 w-[6.5rem] rounded-[0.5rem] border bg-surface-container-lowest px-2 text-right text-sm tabular-nums text-on-surface outline-none focus-visible:ring-[2px] focus-visible:ring-primary/40',
                                invalid ? 'border-error' : changed ? 'border-accent-orange-500' : 'border-transparent',
                              )}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableBox>
        )}
      </Panel>
    </SocialLayout>
  );
}
