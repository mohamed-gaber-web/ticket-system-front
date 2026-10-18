import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { setCollectUi } from '@/redux/slices/collectSlice';
import { getAnalytics, getCollectCustomers } from '@/api/collectApi';
import { MONTHS, MONTHS_SHORT, apiError, compact, money, n0, pct } from '@/lib/collect';
import { COLLECT_BASE, CollectLayout } from '@/components/collect/CollectLayout';
import { ErrorState, Field, KPI_GRID, Kpi, Loading, Panel, Seg, Select, TableBox, TD, TDN, TH, TypeDot } from '@/components/collect/CollectUi';
import type { Analytics, Customer } from '@/types/collect.types';

// Grow Path Collect — monthly analysis (§4, §9.2). Every amount is in EGP.

const AXIS = { fill: 'var(--muted-foreground)', fontSize: 11 };
type View = 'vs' | 'collectedByType' | 'plannedByType';

function HBars({ items, empty, onClick }: { items: { key: string; label: string; value: number; color?: string; tone?: 'crit' }[]; empty: string; onClick?: (key: string) => void }) {
  if (!items.length) return <p className="py-2 text-sm text-on-surface-variant">{empty}</p>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-2.5">
      {items.map((i) => {
        const Row = onClick ? 'button' : 'div';
        return (
          <li key={i.key}>
            <Row
              type={onClick ? 'button' : undefined}
              onClick={onClick ? () => onClick(i.key) : undefined}
              className={cn('block w-full text-start', onClick && 'rounded-md outline-none hover:bg-surface-container-low focus-visible:ring-[2px] focus-visible:ring-primary/40')}
            >
              <span className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate text-on-surface">{i.label}</span>
                <span className={cn('shrink-0 font-semibold tabular-nums', i.tone === 'crit' ? 'text-error' : 'text-on-surface')}>{compact(i.value)}</span>
              </span>
              <span className="mt-1 block h-2 overflow-hidden rounded-full bg-surface-container-high" aria-hidden="true">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${Math.max(2, (i.value / max) * 100)}%`, background: i.tone === 'crit' ? 'var(--color-error)' : i.color ?? 'var(--color-primary)' }}
                />
              </span>
            </Row>
          </li>
        );
      })}
    </ul>
  );
}

export default function CollectAnalytics() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { meta, ui, dataVersion } = useAppSelector((s) => s.collect);
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [view, setView] = useState<View>('vs');
  const types = meta?.types ?? [];
  const todayMonth = meta?.today.slice(0, 7) ?? '';

  useEffect(() => {
    getCollectCustomers()
      .then(setCustomers)
      .catch(() => setCustomers([]));
  }, [dataVersion]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getAnalytics({ year: ui.year, type: ui.type, customer: ui.customer }));
    } catch (e) {
      setError(apiError(e, 'Could not load the analysis'));
    } finally {
      setLoading(false);
    }
  }, [ui.year, ui.type, ui.customer]);

  useEffect(() => {
    if (meta) void load();
  }, [load, meta, dataVersion]);

  const years = useMemo(() => {
    const y = Number(meta?.today.slice(0, 4)) || new Date().getFullYear();
    return [y + 1, y, y - 1, y - 2, y - 3];
  }, [meta?.today]);

  const chart = useMemo(
    () => (data?.monthly ?? []).map((r, k) => ({ label: MONTHS_SHORT[k], planned: r.planned, collected: r.collected, prevYear: r.prevYear })),
    [data],
  );

  const k = data?.kpis;
  const rates = meta?.rates;

  return (
    <CollectLayout>
      <Panel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(3,minmax(0,12rem))_1fr] sm:items-end">
          <Field label="Year" htmlFor="an-year">
            <Select id="an-year" value={String(ui.year)} onChange={(e) => dispatch(setCollectUi({ year: Number(e.target.value) }))}>
              {years.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </Select>
          </Field>
          <Field label="Contract type" htmlFor="an-type">
            <Select id="an-type" value={ui.type} onChange={(e) => dispatch(setCollectUi({ type: e.target.value }))}>
              <option value="all">All types</option>
              {types.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Customer" htmlFor="an-cust">
            <Select id="an-cust" value={ui.customer} onChange={(e) => dispatch(setCollectUi({ customer: e.target.value }))}>
              <option value="all">All customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          {rates && (
            <p className="col-span-2 text-xs text-on-surface-variant sm:col-span-1 sm:pb-2.5 sm:text-end">
              All amounts in EGP · 1 SAR = {rates.SAR} · 1 USD = {rates.USD}
            </p>
          )}
        </div>
      </Panel>

      {error && !data ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : !data || !k ? (
        <Loading rows={6} />
      ) : (
        <div className={cn('space-y-4 transition-opacity', loading && 'opacity-60')}>
          <div className={KPI_GRID}>
            <Kpi label="Active contracts value" value={compact(k.activeValue)} sub={`${k.activeCount} contracts`} />
            <Kpi label="Backlog left to collect" value={compact(k.backlog)} sub={money(k.backlog)} />
            <Kpi label="Overdue to date" value={compact(k.overdue)} sub={`${pct(k.overduePct)} of remaining`} tone={k.overdue > 0.5 ? 'crit' : undefined} onClick={() => navigate(`${COLLECT_BASE}/collection`)} />
            <Kpi label="Due this month" value={compact(k.dueThisMonth)} sub={money(k.dueThisMonth)} />
            <Kpi label={`Collected in ${data.year}`} value={compact(k.collectedYear)} sub={money(k.collectedYear)} />
            <Kpi label={`Collection discipline ${data.year}`} value={pct(k.discipline)} sub="Collected of what was due to date" />
          </div>

          <Panel
            title={`Planned vs collected — ${data.year}`}
            action={
              <div className="flex flex-wrap items-center gap-3 text-xs text-on-surface-variant">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-sm bg-surface-container-highest" /> Planned
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--color-primary)' }} /> Collected
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-4 border-t-2 border-dashed" style={{ borderColor: 'var(--color-accent-orange-500)' }} /> Collected {data.year - 1}
                </span>
              </div>
            }
          >
            <div className="h-72 w-full" role="img" aria-label="Planned vs collected per month">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chart} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-outline-variant)" strokeOpacity={0.5} />
                  <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval={0} />
                  <YAxis tick={AXIS} tickLine={false} axisLine={false} tickCount={5} width={64} tickFormatter={(v: number) => compact(v)} />
                  <Tooltip
                    cursor={{ fill: 'var(--color-surface-container-high)', opacity: 0.5 }}
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <div className="gpc rounded-lg bg-surface-container-highest px-3 py-2 text-xs text-on-surface shadow-ambient">
                          <p className="font-semibold">{label}</p>
                          {payload.map((p) => (
                            <p key={String(p.dataKey)} className="tabular-nums">
                              {p.dataKey === 'planned' ? 'Planned' : p.dataKey === 'collected' ? 'Collected' : `Collected ${data.year - 1}`}: {money(Number(p.value))}
                            </p>
                          ))}
                        </div>
                      ) : null
                    }
                  />
                  <Bar dataKey="planned" fill="var(--color-surface-container-highest)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="collected" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Line dataKey="prevYear" type="monotone" stroke="var(--color-accent-orange-500)" strokeDasharray="5 4" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel
            title="Monthly comparison"
            action={
              <Seg<View>
                label="View"
                value={view}
                onChange={setView}
                options={[
                  { value: 'vs', label: 'Planned vs collected' },
                  { value: 'collectedByType', label: 'Collected by type' },
                  { value: 'plannedByType', label: 'Planned by type' },
                ]}
              />
            }
          >
            <TableBox>
              {view === 'vs' ? (
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/40">
                      <th className={TH}>Month</th>
                      <th className={TH}>Planned</th>
                      <th className={TH}>Collected</th>
                      <th className={TH}>From this month’s dues</th>
                      <th className={TH}>From earlier arrears</th>
                      <th className={TH}>In advance</th>
                      <th className={TH}>Difference</th>
                      <th className={TH}>Collection rate</th>
                      <th className={TH}>Change vs previous month</th>
                      <th className={TH}>Same month {data.year - 1}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30">
                    {data.monthly.map((r, i) => (
                      <tr key={r.month} className={cn(r.month === todayMonth && 'bg-primary/5 font-semibold')}>
                        <td className={TD}>{MONTHS[i]}</td>
                        <td className={TDN}>{n0(r.planned)}</td>
                        <td className={TDN}>{n0(r.collected)}</td>
                        <td className={TDN}>{n0(r.fromMonth)}</td>
                        <td className={TDN}>{n0(r.fromLate)}</td>
                        <td className={TDN}>{n0(r.advance)}</td>
                        <td className={cn(TDN, r.diff > 0.5 ? 'text-emerald-700 dark:text-emerald-300' : r.diff < -0.5 ? 'text-error' : '')}>{n0(r.diff)}</td>
                        <td className={TDN}>{pct(r.rate)}</td>
                        <td className={cn(TDN, r.mom != null && (r.mom >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-error'))}>
                          {r.mom == null ? '—' : `${r.mom >= 0 ? '+' : ''}${pct(r.mom)}`}
                        </td>
                        <td className={TDN}>{n0(r.prevYear)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-outline-variant/60 font-bold">
                      <td className={TD}>Total</td>
                      <td className={TDN}>{n0(data.totals.planned)}</td>
                      <td className={TDN}>{n0(data.totals.collected)}</td>
                      <td className={TDN}>{n0(data.totals.fromMonth)}</td>
                      <td className={TDN}>{n0(data.totals.fromLate)}</td>
                      <td className={TDN}>{n0(data.totals.advance)}</td>
                      <td className={cn(TDN, data.totals.diff < -0.5 ? 'text-error' : 'text-emerald-700 dark:text-emerald-300')}>{n0(data.totals.diff)}</td>
                      <td className={TDN}>{pct(data.totals.rate)}</td>
                      <td className={TDN}>—</td>
                      <td className={TDN}>{n0(data.totals.prevYear)}</td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                (() => {
                  const grid = view === 'collectedByType' ? data.collectedByType : data.plannedByType;
                  const cols = grid.filter((g) => g.values.some((v) => v > 0));
                  const rowTotal = (m: number) => cols.reduce((a, g) => a + g.values[m], 0);
                  return (
                    <table className="w-full min-w-[640px] text-sm">
                      <thead>
                        <tr className="border-b border-outline-variant/40">
                          <th className={TH}>Month</th>
                          {cols.map((g) => {
                            const t = types.find((x) => x.key === g.key);
                            return (
                              <th key={g.key} className={TH}>
                                <span className="inline-flex items-center gap-1.5">
                                  <TypeDot color={t?.color} />
                                  {t?.name ?? g.key}
                                </span>
                              </th>
                            );
                          })}
                          <th className={TH}>Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/30">
                        {MONTHS.map((name, m) => (
                          <tr key={name} className={cn(data.monthly[m].month === todayMonth && 'bg-primary/5 font-semibold')}>
                            <td className={TD}>{name}</td>
                            {cols.map((g) => (
                              <td key={g.key} className={TDN}>
                                {n0(g.values[m])}
                              </td>
                            ))}
                            <td className={cn(TDN, 'font-semibold')}>{n0(rowTotal(m))}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-outline-variant/60 font-bold">
                          <td className={TD}>Total</td>
                          {cols.map((g) => (
                            <td key={g.key} className={TDN}>
                              {n0(g.values.reduce((a, v) => a + v, 0))}
                            </td>
                          ))}
                          <td className={TDN}>{n0(MONTHS.reduce((a, _, m) => a + rowTotal(m), 0))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  );
                })()
              )}
            </TableBox>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-3">
            <Panel title="Remaining by contract type">
              <HBars items={data.remainingByType.map((t) => ({ key: t.key, label: t.name, value: t.value, color: t.color }))} empty="Nothing remaining" />
            </Panel>
            <Panel title="Upcoming collections">
              <HBars items={data.upcoming.map((u) => ({ key: u.key, label: u.label, value: u.value, tone: u.late ? 'crit' : undefined }))} empty="Nothing due" />
            </Panel>
            <Panel title="Top customers by overdue">
              <HBars
                items={data.topOverdue.map((c) => ({ key: c.id, label: c.name, value: c.value, tone: 'crit' }))}
                empty="No overdue amounts"
                onClick={(id) => {
                  dispatch(setCollectUi({ collectionFilter: 'overdue' }));
                  navigate(`${COLLECT_BASE}/collection?customer=${id}`);
                }}
              />
            </Panel>
          </div>
        </div>
      )}
    </CollectLayout>
  );
}
