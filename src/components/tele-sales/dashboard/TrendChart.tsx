import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { LineChart as LineChartIcon } from 'lucide-react';
import { fmtDay } from '@/lib/teleSalesDashboard';
import { formatMoney, type DashboardTrendWeek } from '@/types/teleSales.types';
import { EmptyNote, Panel, Skeleton } from './DashboardUi';

// Theme tokens (they switch with light / dark): records = primary at low
// opacity, won = primary, won value = the orange accent line.
const C_RECORDS = 'var(--chart-1)';
const C_WON = 'var(--chart-3)';
const C_VALUE = 'var(--chart-2)';
const AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 11 };

const compactMoney = (v: number) =>
  v >= 1_000_000 ? `$${Math.round(v / 100_000) / 10}M` : v >= 1_000 ? `$${Math.round(v / 100) / 10}k` : `$${Math.round(v)}`;

function LegendDot({ color, label, line }: { color: string; label: string; line?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={line ? 'h-0.5 w-3 rounded-full' : 'h-2.5 w-2.5 rounded-sm'}
        style={{ background: color, opacity: color === C_RECORDS && !line ? 0.45 : 1 }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

/** Last 12 weeks (Sunday-start, Cairo): new records and deals won as bars, won value as a line on its own axis. */
export function TrendChart({ trend }: { trend: DashboardTrendWeek[] }) {
  const data = trend.map((w) => ({ ...w, label: fmtDay(w.weekStart, false) }));
  const empty = data.every((w) => w.newRecords === 0 && w.won === 0 && w.wonValue === 0);
  const totals = data.reduce(
    (t, w) => ({ records: t.records + w.newRecords, won: t.won + w.won, value: t.value + w.wonValue }),
    { records: 0, won: 0, value: 0 },
  );

  return (
    <Panel
      title="Last 12 weeks"
      icon={<LineChartIcon className="h-4 w-4 text-primary" aria-hidden="true" />}
      action={
        <span className="flex flex-wrap items-center gap-3 text-[11px] text-on-surface-variant">
          <LegendDot color={C_RECORDS} label="New records" />
          <LegendDot color={C_WON} label="Won" />
          <LegendDot color={C_VALUE} label="Won value" line />
        </span>
      }
    >
      {empty ? (
        <EmptyNote title="No activity in the last 12 weeks" hint="New records and won deals appear here week by week." />
      ) : (
        <div
          className="h-64"
          role="img"
          aria-label={`Weekly trend over 12 weeks: ${totals.records} new records, ${totals.won} deals won worth ${formatMoney(totals.value)}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 0, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--muted-foreground)" strokeOpacity={0.15} vertical={false} />
              <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={10} />
              <YAxis yAxisId="count" tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
              <YAxis yAxisId="money" orientation="right" tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} tickFormatter={compactMoney} />
              <Tooltip
                cursor={{ fill: 'var(--muted-foreground)', fillOpacity: 0.08 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const w = payload[0].payload as (typeof data)[number];
                  return (
                    <div className="rounded-lg bg-surface-container-lowest px-3 py-2 text-xs shadow-ambient ring-1 ring-outline-variant/40">
                      <p className="font-semibold text-on-surface">Week of {fmtDay(w.weekStart)}</p>
                      <p className="text-on-surface-variant">{w.newRecords.toLocaleString('en-US')} new records</p>
                      <p className="text-on-surface-variant">{w.won.toLocaleString('en-US')} won</p>
                      <p className="text-on-surface-variant">{formatMoney(w.wonValue)} won value</p>
                    </div>
                  );
                }}
              />
              <Bar yAxisId="count" dataKey="newRecords" name="New records" fill={C_RECORDS} fillOpacity={0.45} radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Bar yAxisId="count" dataKey="won" name="Won" fill={C_WON} radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Line
                yAxisId="money"
                type="monotone"
                dataKey="wonValue"
                name="Won value"
                stroke={C_VALUE}
                strokeWidth={2}
                dot={{ r: 2.5, fill: C_VALUE, strokeWidth: 0 }}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

export function TrendSkeleton() {
  return (
    <Panel title="Last 12 weeks">
      <Skeleton className="h-64" />
    </Panel>
  );
}
