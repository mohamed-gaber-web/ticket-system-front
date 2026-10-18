import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { GitCompare, Trophy, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { clearCompare, fetchSocialCompare } from '@/redux/slices/socialSlice';
import { SOCIAL_BASE, SocialLayout } from '@/components/social/SocialLayout';
import { Pill, PlatformDot, ViewBar } from '@/components/social/SocialUi';
import { EmptyState, ErrorState, LoadingRows, Panel } from '@/components/vault/VaultUi';
import { COMPARE_COLORS, CONTENT_TYPE_LABELS, METRICS, PLATFORM_LABELS, fmtDay, fmtMetric, monthLabel } from '@/lib/socialPulse';

/** Compare 2–4 posts metric by metric (§7.7), in the current view. */
export default function SocialCompare() {
  const dispatch = useAppDispatch();
  const { ui, compare, compareStatus, compareError, dataVersion } = useAppSelector((s) => s.social);
  const { compareIds, view, month } = ui;
  const enough = compareIds.length >= 2;

  useEffect(() => {
    if (!enough || (view === 'month' && !month)) return;
    void dispatch(fetchSocialCompare({ ids: compareIds, view, month: view === 'month' ? month : undefined }));
  }, [dispatch, compareIds, enough, view, month, dataVersion]);

  const items = useMemo(() => compare?.items ?? [], [compare]);

  const rows = useMemo(() => {
    const out: { key: string; label: string; format: (typeof METRICS)[number]['format']; values: (number | null)[]; best: number }[] = [];
    for (const m of METRICS) {
      const values = items.map((it) => (it.aggregate ? m.get(it.aggregate) : null));
      if (values.every((v) => v == null || v === 0)) continue;
      let best = -1;
      values.forEach((v, i) => {
        if (v == null) return;
        if (best < 0 || (m.lowerIsBetter ? v < (values[best] as number) : v > (values[best] as number))) best = i;
      });
      out.push({ key: m.key, label: m.label, format: m.format, values, best });
    }
    return out;
  }, [items]);

  const winner = useMemo(() => {
    const wins = items.map(() => 0);
    for (const r of rows) if (r.best >= 0) wins[r.best] += 1;
    const top = Math.max(0, ...wins);
    const i = wins.indexOf(top);
    return top > 0 ? { index: i, wins: top } : null;
  }, [items, rows]);

  if (!enough) {
    return (
      <SocialLayout title="Compare">
        <Panel>
          <EmptyState
            icon={<GitCompare className="h-6 w-6" />}
            title="Pick two to four posts to compare"
            hint={
              <Button asChild className="mt-2">
                <Link to={`${SOCIAL_BASE}/posts`}>Go to Posts</Link>
              </Button>
            }
          />
        </Panel>
      </SocialLayout>
    );
  }

  const viewNote = view === 'month' ? `Gained in ${monthLabel(month)}` : 'Cumulative total';

  return (
    <SocialLayout
      title={`Comparing ${compareIds.length} posts`}
      description={viewNote}
      actions={
        <Button variant="outline" onClick={() => dispatch(clearCompare())}>
          <X /> Clear selection
        </Button>
      }
    >
      <ViewBar />

      {!compare && compareStatus === 'failed' ? (
        <ErrorState message={compareError ?? 'Could not compare the posts'} />
      ) : !compare ? (
        <LoadingRows rows={4} />
      ) : (
        <div className={cn('space-y-4', compareStatus === 'loading' && 'opacity-60')}>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-3">
            {items.map((it, i) => (
              <article
                key={it.post.id}
                className="min-w-0 rounded-[1rem] border-t-4 bg-surface-container-lowest p-4"
                style={{ borderTopColor: COMPARE_COLORS[i] }}
              >
                <Link to={`${SOCIAL_BASE}/posts/${it.post.id}`} dir="auto" className="line-clamp-2 font-semibold text-on-surface hover:underline">
                  {it.post.title}
                </Link>
                <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-on-surface-variant">
                  <PlatformDot platform={it.post.platform} />
                  {PLATFORM_LABELS[it.post.platform]} · {CONTENT_TYPE_LABELS[it.post.type]} · {fmtDay(it.post.publishDate)}
                  {!it.values && <span className="font-semibold text-amber-700 dark:text-amber-300">· not pulled this month</span>}
                </p>
              </article>
            ))}
          </div>

          {rows.length === 0 ? (
            <Panel>
              <p className="text-sm text-on-surface-variant">None of these posts has numbers in this view.</p>
            </Panel>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {rows.map((r) => {
                const max = Math.max(...r.values.map((v) => Math.abs(v ?? 0)), 0) || 1;
                return (
                  <Panel key={r.key} title={r.label}>
                    <ul className="space-y-2">
                      {items.map((it, i) => {
                        const v = r.values[i];
                        return (
                          <li key={it.post.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1">
                            <span className="h-2.5 overflow-hidden rounded-full bg-surface-container-high" aria-hidden="true">
                              <span
                                className="block h-full rounded-full"
                                style={{ width: v == null ? 0 : `${Math.max(2, (Math.abs(v) / max) * 100)}%`, background: COMPARE_COLORS[i] }}
                              />
                            </span>
                            <span className="flex items-center justify-end gap-1.5 text-sm font-semibold tabular-nums text-on-surface">
                              <span className="sr-only">{it.post.title}: </span>
                              {fmtMetric(r.format, v)}
                              {r.best === i && <Pill tone="ok">Best</Pill>}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </Panel>
                );
              })}
            </div>
          )}

          {winner && items[winner.index] && (
            <Panel>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-orange-500/10 text-accent-orange-500" aria-hidden="true">
                  <Trophy className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">Wins on the most metrics</p>
                  <p dir="auto" className="truncate font-semibold text-on-surface">
                    {items[winner.index].post.title}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    Best on {winner.wins} metric{winner.wins === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
            </Panel>
          )}
        </div>
      )}
    </SocialLayout>
  );
}
