import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BellRing, Building2, History, KeyRound, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchVaultDashboard } from '@/redux/slices/vaultReportsSlice';
import { dueChip, fmtDateTime, passwordAgeTone, refName } from '@/lib/vault';
import { VaultLayout } from '@/components/vault/VaultLayout';
import { Chip, EmptyState, ErrorState, Panel } from '@/components/vault/VaultUi';

const localDayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const dayLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 11 };

function Kpi({ label, value, sub, tone, icon }: { label: string; value: number; sub?: string; tone?: 'warn' | 'bad'; icon: ReactNode }) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-start gap-3 rounded-[1rem] bg-surface-container-lowest p-4',
        tone === 'warn' && 'ring-1 ring-amber-500/40',
        tone === 'bad' && 'ring-1 ring-error/40',
      )}
    >
      <span
        className={cn(
          'grid h-9 w-9 shrink-0 place-items-center rounded-xl',
          tone === 'warn'
            ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
            : tone === 'bad'
              ? 'bg-error/10 text-error'
              : 'bg-primary/10 text-primary',
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            'text-2xl font-extrabold tabular-nums leading-tight',
            tone === 'warn' ? 'text-amber-700 dark:text-amber-300' : tone === 'bad' ? 'text-error' : 'text-on-surface',
          )}
        >
          {value}
        </p>
        <p className="text-xs font-semibold text-on-surface-variant">{label}</p>
        {sub && <p className="text-[11px] text-on-surface-variant">{sub}</p>}
      </div>
    </div>
  );
}

/** label · bar · count, top 6. */
function BarList({ title, rows, empty }: { title: string; rows: { key: string; label: string; count: number }[]; empty: string }) {
  const top = [...rows].sort((a, b) => b.count - a.count).slice(0, 6);
  const max = Math.max(1, ...top.map((r) => r.count));
  return (
    <Panel title={title}>
      {top.length ? (
        <ul className="space-y-2">
          {top.map((r) => (
            <li key={r.key} className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_2rem] items-center gap-2 text-sm">
              <span className="truncate text-on-surface" title={r.label}>
                {r.label}
              </span>
              <span className="h-2 overflow-hidden rounded-full bg-surface-container-high" aria-hidden="true">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${(r.count / max) * 100}%` }} />
              </span>
              <span className="text-right font-semibold tabular-nums text-on-surface">{r.count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-on-surface-variant">{empty}</p>
      )}
    </Panel>
  );
}

/** Dashboard: KPIs, 14-day sends, follow-ups and the busiest accounts and people. */
export default function VaultDashboard() {
  const dispatch = useAppDispatch();
  const { dashboard: d, dashboardStatus, dashboardError } = useAppSelector((s) => s.vaultReports);

  useEffect(() => {
    void dispatch(fetchVaultDashboard());
  }, [dispatch]);

  const reload = () => void dispatch(fetchVaultDashboard());

  if (!d) {
    return (
      <VaultLayout title="Dashboard">
        {dashboardStatus === 'failed' ? (
          <ErrorState message={dashboardError ?? 'Could not load the dashboard'} onRetry={reload} />
        ) : (
          <div className="space-y-4" aria-busy="true" aria-label="Loading the dashboard">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,170px),1fr))] gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-[1rem] bg-surface-container-low" />
              ))}
            </div>
            <div className="h-72 animate-pulse rounded-[1rem] bg-surface-container-low" />
          </div>
        )}
      </VaultLayout>
    );
  }

  const today = localDayKey();
  const chart = d.sendsPerDay.map((p, i) => ({
    ...p,
    label: dayLabel(p.date),
    isToday: p.date === today || (!d.sendsPerDay.some((x) => x.date === today) && i === d.sendsPerDay.length - 1),
  }));
  const k = d.kpis;
  const isEmpty = k.totalEntries === 0;

  return (
    <VaultLayout title="Dashboard" description="What is stored, what was sent, and what needs attention.">
      {dashboardStatus === 'failed' && (
        <p role="alert" className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
          {dashboardError} — showing the last loaded figures.
        </p>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,170px),1fr))] gap-3">
        <Kpi icon={<KeyRound className="h-4 w-4" />} label="Stored accounts" value={k.totalEntries} sub={`${k.companyEntries} for the company`} />
        <Kpi icon={<Building2 className="h-4 w-4" />} label="Clients with accounts" value={k.clientsWithEntries} />
        <Kpi icon={<Send className="h-4 w-4" />} label="Sends this month" value={k.sendsThisMonth} />
        <Kpi
          icon={<History className="h-4 w-4" />}
          label="Passwords unchanged 90+ days"
          value={k.stalePasswords}
          tone={k.stalePasswords > 0 ? 'warn' : undefined}
        />
        <Kpi
          icon={<BellRing className="h-4 w-4" />}
          label="Access or renewal within 30 days"
          value={k.dueSoon}
          tone={k.dueSoon > 0 ? 'bad' : undefined}
        />
      </div>

      {isEmpty && (
        <div className="rounded-[1rem] bg-surface-container-lowest">
          <EmptyState
            icon={<KeyRound className="h-6 w-6" />}
            title="The vault is empty"
            hint={
              <>
                Stored accounts appear in <Link to="/vault/accounts" className="text-primary hover:underline">Accounts</Link>; the figures here follow.
              </>
            }
          />
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-4 min-[820px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <Panel title="Sends — last 14 days">
            {chart.every((c) => c.count === 0) ? (
              <p className="py-8 text-center text-sm text-on-surface-variant">No sends in the last 14 days.</p>
            ) : (
              <div className="h-56" role="img" aria-label={`Sends per day over the last 14 days, ${chart.reduce((s, c) => s + c.count, 0)} in total`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--muted-foreground)" strokeOpacity={0.15} vertical={false} />
                    <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
                    <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
                    <Tooltip
                      cursor={{ fill: 'var(--muted-foreground)', fillOpacity: 0.08 }}
                      content={({ active, payload, label }) =>
                        active && payload?.length ? (
                          <div className="rounded-lg bg-surface-container-lowest px-3 py-2 text-xs shadow-ambient ring-1 ring-outline-variant/40">
                            <p className="font-semibold text-on-surface">{label}</p>
                            <p className="text-on-surface-variant">
                              {String(payload[0].value)} send{payload[0].value === 1 ? '' : 's'}
                            </p>
                          </div>
                        ) : null
                      }
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={32}>
                      {chart.map((c) => (
                        <Cell key={c.date} fill="var(--primary)" fillOpacity={c.isToday ? 1 : 0.7} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>

          <Panel title="Needs follow-up: access validity or renewal">
            {d.dueList.length ? (
              <ul className="divide-y divide-outline-variant/20">
                {d.dueList.map((r) => {
                  const chip = dueChip(r.kind, r.dueInDays);
                  return (
                    <li key={r.entryId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span className="min-w-0">
                        <b className="block truncate text-sm text-on-surface">{r.platform}</b>
                        <span className="text-xs text-on-surface-variant">{r.ownerLabel}</span>
                      </span>
                      {chip && <Chip tone={chip.tone}>{chip.text}</Chip>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-on-surface-variant">Nothing expires or renews in the next 30 days.</p>
            )}
          </Panel>

          <Panel
            title="Recent sends"
            action={
              <Link to="/vault/log" className="text-xs font-semibold text-primary hover:underline">
                Open the log
              </Link>
            }
          >
            {d.recentSends.length ? (
              <ul className="divide-y divide-outline-variant/20">
                {d.recentSends.map((r, i) => (
                  <li key={`${r.sentAt}-${i}`} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2 text-sm">
                    <span className="min-w-0">
                      <b className="text-on-surface">{r.recipientName}</b>
                      <span className="text-on-surface-variant">
                        {' '}
                        · {r.entriesCount} account{r.entriesCount === 1 ? '' : 's'}
                        {refName(r.purpose) ? ` · ${refName(r.purpose)}` : ''}
                      </span>
                    </span>
                    <span className="text-xs text-on-surface-variant">{fmtDateTime(r.sentAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-on-surface-variant">Nothing sent yet.</p>
            )}
          </Panel>
        </div>

        <div className="min-w-0 space-y-4">
          <BarList
            title="Most shared"
            rows={d.topShared.map((r) => ({ key: r.entryId, label: r.platform, count: r.count }))}
            empty="No account has been sent yet."
          />
          <BarList title="Sends by employee" rows={d.sendsByUser.map((r) => ({ key: r.userId, label: r.name, count: r.count }))} empty="No sends yet." />
          <BarList
            title="Accounts by sensitivity"
            rows={d.entriesBySensitivity.map((r) => ({ key: r.id ?? r.name, label: r.name || 'Not set', count: r.count }))}
            empty="No accounts yet."
          />
          <BarList
            title="Accounts by category"
            rows={d.entriesByCategory.map((r) => ({ key: r.id ?? r.name, label: r.name || 'Not set', count: r.count }))}
            empty="No accounts yet."
          />
          <Panel title="Passwords due for a change">
            {d.stalePasswordList.length ? (
              <ul className="divide-y divide-outline-variant/20">
                {d.stalePasswordList.map((r) => (
                  <li key={r.entryId} className="flex items-center justify-between gap-2 py-2">
                    <span className="min-w-0">
                      <b className="block truncate text-sm text-on-surface">{r.platform}</b>
                      <span className="text-xs text-on-surface-variant">{r.ownerLabel}</span>
                    </span>
                    <Chip tone={passwordAgeTone(r.ageDays)}>{r.ageDays} days</Chip>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-on-surface-variant">Every password was changed in the last 90 days.</p>
            )}
          </Panel>
        </div>
      </div>
    </VaultLayout>
  );
}
