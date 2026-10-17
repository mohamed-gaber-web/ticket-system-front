import { cn } from '@/lib/utils';
import { KPI_DEFS, formatKpi, kpiDelta, type KpiDef } from '@/lib/teleSalesDashboard';
import type { DashboardKpi, TeleSalesDashboardData } from '@/types/teleSales.types';
import { Skeleton } from './DashboardUi';

const TONE_CLS = {
  good: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  bad: 'bg-error/10 text-error',
  neutral: 'bg-surface-container-high text-on-surface-variant',
} as const;

const GRID = 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,150px),1fr))] gap-3';

function KpiCard({ def, kpi }: { def: KpiDef; kpi: DashboardKpi }) {
  const delta = kpiDelta(kpi.value, kpi.previous, def.format, def.polarity);
  const prev = formatKpi(kpi.previous, def.format);
  const arrow = delta.direction === 'up' ? '▲' : delta.direction === 'down' ? '▼' : '';
  const spoken =
    delta.text === null
      ? `No previous figure to compare (previous period: ${prev})`
      : delta.direction === 'flat'
        ? `Same as the previous period (${prev})`
        : `${delta.direction === 'up' ? 'Up' : 'Down'} ${delta.text} vs the previous period (${prev})`;

  return (
    <div
      className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-3"
      title={def.hint ? `${def.hint}. Previous period: ${prev}` : `Previous period: ${prev}`}
    >
      <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">{def.label}</p>
      <p className="truncate text-xl font-extrabold leading-tight tabular-nums text-on-surface">{formatKpi(kpi.value, def.format)}</p>
      <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px]">
        <span className={cn('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-bold tabular-nums', TONE_CLS[delta.tone])}>
          <span aria-hidden="true">{arrow}</span>
          <span aria-hidden="true">{delta.text ?? '—'}</span>
          <span className="sr-only">{spoken}</span>
        </span>
        <span className="truncate text-on-surface-variant" aria-hidden="true">
          vs {prev}
        </span>
      </p>
    </div>
  );
}

/** The period figures, each against the previous period. */
export function KpiGrid({ kpis }: { kpis: TeleSalesDashboardData['kpis'] }) {
  return (
    <section aria-label="Period figures" className={GRID}>
      {KPI_DEFS.map((def) => (
        <KpiCard key={def.key} def={def} kpi={kpis[def.key] ?? { value: null, previous: null }} />
      ))}
    </section>
  );
}

export function KpiGridSkeleton() {
  return (
    <div className={GRID} aria-hidden="true">
      {KPI_DEFS.map((d) => (
        <Skeleton key={d.key} className="h-[86px] rounded-xl" />
      ))}
    </div>
  );
}
