import { useEffect, useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAccess } from '@/redux/hooks/useAccess';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchSocialDashboard } from '@/redux/slices/socialSlice';
import { SOCIAL_BASE, SocialLayout } from '@/components/social/SocialLayout';
import { BarList, FilterBar, MetricSwitcher, ViewBar, type BarItem } from '@/components/social/SocialUi';
import { EmptyState, ErrorState, Panel } from '@/components/vault/VaultUi';
import {
  CONTENT_TYPE_LABELS,
  PLATFORM_COLORS,
  PLATFORM_LABELS,
  categoryLabel,
  fmtMetric,
  fmtMoney,
  fmtNumber,
  fmtPercent,
  metricDef,
  monthLabel,
  monthShort,
  type MetricDef,
} from '@/lib/socialPulse';
import type { BestGroup, ContentType, GroupSums, Platform, SocialDashboard as Dash, Sums } from '@/types/social.types';

const AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 11 };

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

function Kpi({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-[1rem] p-4',
        highlight ? 'bg-primary text-primary-foreground' : 'bg-surface-container-lowest',
      )}
    >
      <p className={cn('text-xs font-semibold', highlight ? 'text-primary-foreground/85' : 'text-on-surface-variant')}>{label}</p>
      <p className={cn('mt-0.5 text-2xl font-extrabold leading-tight tabular-nums', !highlight && 'text-on-surface')}>{value}</p>
      {sub && <p className={cn('mt-0.5 truncate text-[11px] tabular-nums', highlight ? 'text-primary-foreground/85' : 'text-on-surface-variant')}>{sub}</p>}
    </div>
  );
}

function KpiStrip({ d }: { d: Dash }) {
  const t = d.totals;
  const month = d.view === 'month';
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-3">
      <Kpi
        label={month ? 'Posts pulled' : 'Posts'}
        value={fmtNumber(t.count)}
        sub={month ? monthLabel(d.month) : `${d.platformCount} platform${d.platformCount === 1 ? '' : 's'}`}
      />
      <Kpi label={month ? 'Reach gained' : 'Total reach'} value={fmtNumber(t.reach)} sub={`${fmtNumber(t.impressions)} impressions`} />
      <Kpi
        label={month ? 'Engagement gained' : 'Total engagement'}
        value={fmtNumber(t.eng)}
        sub={`${fmtNumber(t.comments)} comments · ${fmtNumber(t.shares)} shares`}
      />
      <Kpi label="Engagement rate" value={fmtPercent(ratio(t.eng, t.reach))} sub="Engagement ÷ reach" highlight />
      <Kpi label="Clicks" value={fmtNumber(t.clicks)} sub={`CTR ${fmtPercent(ratio(t.clicks, t.impressions))}`} />
      <Kpi
        label="Leads"
        value={fmtNumber(t.leads)}
        sub={`Cost/lead ${fmtMoney(t.spend > 0 && t.leads > 0 ? t.spend / t.leads : null)}`}
      />
      <Kpi label="New followers" value={fmtNumber(t.followers)} sub={`Spend ${fmtMoney(t.spend)}`} />
    </div>
  );
}

function TrendChart({ d, def }: { d: Dash; def: MetricDef }) {
  const highlight = d.view === 'month' ? d.month : d.trend.at(-1)?.month;
  const data = d.trend.map((t) => ({
    month: t.month,
    label: monthShort(t.month),
    value: def.get(t.sums) ?? 0,
    raw: def.get(t.sums),
    posts: t.postCount,
    hi: t.month === highlight,
  }));
  const showAll = data.length <= 8;
  const tick = (v: number) => (def.format === 'percent' ? fmtMetric('percent', v) : fmtNumber(v));

  return (
    <Panel title={`${def.label} gained each month`}>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-on-surface-variant">No monthly pulls yet.</p>
      ) : (
        <div className="h-64 w-full" role="img" aria-label={`${def.label} gained each month`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 22, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--color-outline-variant)" strokeOpacity={0.45} />
              <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickCount={5} width={52} tickFormatter={tick} allowDecimals={def.format !== 'number'} />
              <Tooltip
                cursor={{ fill: 'var(--color-surface-container-high)', opacity: 0.6 }}
                content={({ active, payload }) => {
                  const p = active && payload?.[0]?.payload;
                  if (!p) return null;
                  return (
                    <div className="rounded-lg bg-surface-container-highest px-3 py-2 text-xs text-on-surface shadow-ambient">
                      {monthLabel(p.month)}: <strong className="tabular-nums">{fmtMetric(def.format, p.raw)}</strong> ({p.posts} posts)
                    </div>
                  );
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56}>
                {data.map((row) => (
                  <Cell key={row.month} fill={row.hi ? 'var(--color-accent-orange-500)' : 'var(--chart-1)'} />
                ))}
                <LabelList
                  dataKey="raw"
                  position="top"
                  className="tabular-nums"
                  fill="var(--muted-foreground)"
                  fontSize={11}
                  formatter={(v: unknown) => fmtMetric(def.format, v as number | null)}
                  content={showAll ? undefined : (props) => {
                    const { x, y, width, index, value } = props as { x: number; y: number; width: number; index: number; value: number | null };
                    if (!data[index]?.hi) return null;
                    return (
                      <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">
                        {fmtMetric(def.format, value)}
                      </text>
                    );
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

function InsightCard({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-[0.75rem] bg-surface-container-low p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">{label}</p>
      <p dir="auto" className="mt-1 truncate font-semibold text-on-surface" title={typeof value === 'string' ? value : undefined}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs tabular-nums text-on-surface-variant">{sub}</p>}
    </div>
  );
}

const liftText = (g: BestGroup) => {
  if (g.lift == null) return fmtPercent(g.er);
  const pct = Math.round(g.lift * 100);
  return `${fmtPercent(g.er)} · ${pct >= 0 ? '+' : ''}${pct}% vs average`;
};

function Insights({ d }: { d: Dash }) {
  const ins = d.insights;
  const cards: ReactNode[] = [];
  if (ins.needsMore) {
    cards.push(<InsightCard key="more" label="Needs at least two posts" value="Add more results to see comparisons" />);
  } else {
    if (ins.mostEngaging) {
      cards.push(
        <InsightCard
          key="most"
          label="Most engaging post"
          value={
            <Link to={`${SOCIAL_BASE}/posts/${ins.mostEngaging.id}`} className="hover:underline">
              {ins.mostEngaging.title}
            </Link>
          }
          sub={`${fmtPercent(ins.mostEngaging.er)} on ${PLATFORM_LABELS[ins.mostEngaging.platform]}`}
        />,
      );
    }
    if (d.view === 'month' && ins.earlier) {
      cards.push(
        <InsightCard
          key="earlier"
          label="From earlier months' posts"
          value={ins.earlier.share == null ? '—' : `${Math.round(ins.earlier.share * 100)}% of this month's engagement`}
          sub={`${ins.earlier.posts} post${ins.earlier.posts === 1 ? '' : 's'} still bringing results`}
        />,
      );
    }
    const best = ins.best;
    const groups: [string, BestGroup | null | undefined][] = [
      ['Best platform', best?.platform],
      ['Best content type', best?.type],
      ['Best series', best?.category],
      ['Best posting day', best?.weekday],
      ['Paid vs organic', best?.paid],
    ];
    for (const [label, g] of groups) {
      if (g) cards.push(<InsightCard key={label} label={label} value={g.label} sub={liftText(g)} />);
    }
  }
  return (
    <Panel title="Quick insights">
      <p className="-mt-1 text-xs text-on-surface-variant">Top performers in the current view, ranked by engagement rate (engagement ÷ reach).</p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-2">{cards}</div>
    </Panel>
  );
}

const ranked = <T,>(rows: T[], def: MetricDef, sums: (r: T) => Sums) =>
  rows
    .map((r) => ({ r, v: def.get(sums(r)) }))
    .filter((x): x is { r: T; v: number } => x.v != null && Number.isFinite(x.v))
    .sort((a, b) => (def.lowerIsBetter ? a.v - b.v : b.v - a.v));

function Breakdown({ title, groups, def, labelOf, dotOf }: { title: string; groups: GroupSums[]; def: MetricDef; labelOf: (k: string) => string; dotOf?: (k: string) => string }) {
  const items: BarItem[] = ranked(groups, def, (g) => g.sums).map(({ r, v }) => ({
    key: r.key,
    label: labelOf(r.key),
    value: v,
    display: fmtMetric(def.format, v),
    sub: `${r.postCount} post${r.postCount === 1 ? '' : 's'}`,
    dot: dotOf?.(r.key),
  }));
  return (
    <Panel title={title}>
      <BarList items={items} empty={`Not enough data for ${def.label.toLowerCase()}`} />
    </Panel>
  );
}

function PostList({ title, rows, note, def }: { title: string; rows: { r: Dash['posts'][number]; v: number }[]; note: string; def: MetricDef }) {
  const items: BarItem[] = rows.map(({ r, v }) => ({
    key: r.id,
    label: r.title,
    value: v,
    display: fmtMetric(def.format, v),
    dot: PLATFORM_COLORS[r.platform],
    color: PLATFORM_COLORS[r.platform],
  }));
  return (
    <Panel title={title} action={<span className="text-xs text-on-surface-variant">{note}</span>}>
      <BarList items={items} highlightFirst={false} empty={`Not enough data for ${def.label.toLowerCase()}`} />
    </Panel>
  );
}

/** Dashboard (§7.3): view bar, filters, KPIs, trend, insights, breakdowns, top and weakest posts. */
export default function SocialDashboard() {
  const dispatch = useAppDispatch();
  const { canWriteSocial } = useAccess();
  const { ui, dashboard: d, dashboardStatus, dashboardError, dataVersion, meta } = useAppSelector((s) => s.social);
  const { view, month, filters, metric } = ui;
  const def = metricDef(metric);

  // The metric is derived client-side from the sums — switching it never refetches.
  useEffect(() => {
    if (view === 'month' && !month) return;
    void dispatch(fetchSocialDashboard({ ...filters, view, month: view === 'month' ? month : undefined }));
  }, [dispatch, filters, view, month, dataVersion]);

  const topWeak = useMemo(() => {
    if (!d) return { top: [], weak: [] };
    const all = ranked(d.posts, def, (p) => p.sums);
    return { top: all.slice(0, 6), weak: d.posts.length > 6 ? all.slice(-5).reverse() : [] };
  }, [d, def]);

  const reload = () => void dispatch(fetchSocialDashboard({ ...filters, view, month: view === 'month' ? month : undefined }));
  const note = `By ${def.label.toLowerCase()}${view === 'month' ? ` in ${monthLabel(month)}` : ''}`;
  const noPosts = meta?.postCount === 0;

  return (
    <SocialLayout
      title="Dashboard"
      actions={
        canWriteSocial ? (
          <Button asChild>
            <Link to={`${SOCIAL_BASE}/posts/new`}>
              <Plus /> New post
            </Link>
          </Button>
        ) : undefined
      }
    >
      <ViewBar />
      <FilterBar />

      {noPosts ? (
        <Panel>
          <EmptyState
            icon={<BarChart3 className="h-6 w-6" />}
            title="No posts entered yet"
            hint={canWriteSocial ? 'Add a post, or import an export from Meta Business Suite, LinkedIn, YouTube Studio or TikTok in Monthly pull.' : undefined}
          />
        </Panel>
      ) : !d ? (
        dashboardStatus === 'failed' ? (
          <ErrorState message={dashboardError ?? 'Could not load the dashboard'} onRetry={reload} />
        ) : (
          <div className="space-y-4" aria-busy="true" aria-label="Loading the dashboard">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-[1rem] bg-surface-container-low" />
              ))}
            </div>
            <div className="h-72 animate-pulse rounded-[1rem] bg-surface-container-low" />
          </div>
        )
      ) : (
        <div className={cn('space-y-4 transition-opacity', dashboardStatus === 'loading' && 'opacity-60')}>
          {dashboardStatus === 'failed' && (
            <p role="alert" className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
              {dashboardError} — showing the last loaded figures.
            </p>
          )}
          <KpiStrip d={d} />
          <MetricSwitcher />
          <TrendChart d={d} def={def} />
          <Insights d={d} />
          <div className="grid gap-4 lg:grid-cols-3">
            <Breakdown
              title="By platform"
              groups={d.byPlatform}
              def={def}
              labelOf={(k) => PLATFORM_LABELS[k as Platform] ?? k}
              dotOf={(k) => PLATFORM_COLORS[k as Platform]}
            />
            <Breakdown title="By content type" groups={d.byType} def={def} labelOf={(k) => CONTENT_TYPE_LABELS[k as ContentType] ?? k} />
            <Breakdown title="By category / series" groups={d.byCategory} def={def} labelOf={categoryLabel} />
          </div>
          <div className={cn('grid gap-4', topWeak.weak.length > 0 && 'lg:grid-cols-2')}>
            <PostList title="Top posts" rows={topWeak.top} note={note} def={def} />
            {topWeak.weak.length > 0 && <PostList title="Weakest posts" rows={topWeak.weak} note={note} def={def} />}
          </div>
        </div>
      )}
    </SocialLayout>
  );
}
