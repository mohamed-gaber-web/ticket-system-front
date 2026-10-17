import { Filter } from 'lucide-react';
import type { DashboardFunnelStep } from '@/types/teleSales.types';
import { EmptyNote, Panel, Skeleton } from './DashboardUi';

const stepPct = (count: number, prev: number): string | null => (prev > 0 ? `${Math.round((count / prev) * 1000) / 10}%` : null);

/**
 * Period funnel: New records → Lead → Opportunity → Proposal Sent → Closed Won,
 * with the conversion from the step above. These are period counts, not one
 * cohort, so a step can be above 100%.
 */
export function FunnelCard({ funnel }: { funnel: DashboardFunnelStep[] }) {
  const max = Math.max(1, ...funnel.map((s) => s.count));
  const empty = funnel.every((s) => s.count === 0);

  return (
    <Panel title="Funnel" icon={<Filter className="h-4 w-4 text-primary" aria-hidden="true" />}>
      {empty ? (
        <EmptyNote title="Nothing moved through the funnel" hint="No records were created, converted, sent a proposal or won in this period." />
      ) : (
        <>
          <ol className="space-y-2.5">
            {funnel.map((s, i) => {
              const pct = i > 0 ? stepPct(s.count, funnel[i - 1].count) : null;
              const width = s.count > 0 ? Math.max((s.count / max) * 100, 2) : 0;
              return (
                <li key={s.key} className="min-w-0">
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                    <span className="truncate font-semibold text-on-surface">{s.label}</span>
                    <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                      {i > 0 && (
                        <span className="text-on-surface-variant" title={`Conversion from ${funnel[i - 1].label}`}>
                          {pct ?? '—'}
                          <span className="sr-only"> of {funnel[i - 1].label}</span>
                        </span>
                      )}
                      <span className="font-bold text-on-surface">{s.count.toLocaleString('en-US')}</span>
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-surface-container-high" aria-hidden="true">
                    <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${width}%`, opacity: 1 - i * 0.12 }} />
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-[11px] text-on-surface-variant">
            % = this step ÷ the step above, both counted in the period (not one cohort, so it can pass 100%).
          </p>
        </>
      )}
    </Panel>
  );
}

export function FunnelSkeleton() {
  return (
    <Panel title="Funnel">
      <div className="space-y-3" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7" />
        ))}
      </div>
    </Panel>
  );
}
