import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatKpi } from '@/lib/teleSalesDashboard';
import type { DashboardLeaderboardRow } from '@/types/teleSales.types';
import { EmptyNote, Panel, Skeleton } from './DashboardUi';

type SortKey = Exclude<keyof DashboardLeaderboardRow, 'agent'> | 'name';

const COLUMNS: { key: SortKey; label: string; short?: string; money?: boolean; percent?: boolean }[] = [
  { key: 'name', label: 'Agent' },
  { key: 'calls', label: 'Calls' },
  { key: 'callsAnswered', label: 'Answered' },
  { key: 'followUpsDone', label: 'Follow-ups' },
  { key: 'convertedToLead', label: 'To Lead', short: 'Converted to Lead' },
  { key: 'convertedToOpportunity', label: 'To Opp.', short: 'Converted to Opportunity' },
  { key: 'proposalsSent', label: 'Proposals' },
  { key: 'won', label: 'Won' },
  { key: 'wonValue', label: 'Won value', money: true },
  { key: 'lost', label: 'Lost' },
  { key: 'winRate', label: 'Win rate', percent: true },
];

const valueOf = (r: DashboardLeaderboardRow, k: SortKey): number | string => (k === 'name' ? r.agent.name : (r[k] ?? -1));

/**
 * Agents ranked for the period (managers, admins, cross-team readers). Click a
 * column to sort; click a row to filter the whole dashboard to that agent.
 */
export function Leaderboard({
  rows,
  selectedAgent,
  onSelectAgent,
}: {
  rows: DashboardLeaderboardRow[];
  selectedAgent: string;
  onSelectAgent: (agentId: string) => void;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'wonValue', dir: 'desc' });

  const sorted = useMemo(() => {
    const out = [...rows];
    out.sort((a, b) => {
      const va = valueOf(a, sort.key);
      const vb = valueOf(b, sort.key);
      const cmp = typeof va === 'string' || typeof vb === 'string' ? String(va).localeCompare(String(vb)) : va - vb;
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return out;
  }, [rows, sort]);

  const toggle = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' ? 'asc' : 'desc' }));

  return (
    <Panel
      title="Agent leaderboard"
      icon={<Trophy className="h-4 w-4 text-primary" aria-hidden="true" />}
      action={<span className="text-[11px] text-on-surface-variant">Click a row to filter by that agent</span>}
      bodyClassName="p-0"
    >
      {rows.length === 0 ? (
        <EmptyNote title="No agents to rank" hint="No agent had activity in this period for this filter." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-xs">
            <caption className="sr-only">Agent leaderboard, sortable by column</caption>
            <thead>
              <tr className="border-b border-outline-variant/15 text-on-surface-variant">
                <th scope="col" className="w-10 px-3 py-2 text-left font-semibold">
                  #
                </th>
                {COLUMNS.map((c) => {
                  const active = sort.key === c.key;
                  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
                  return (
                    <th
                      key={c.key}
                      scope="col"
                      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      className={cn('px-2 py-1.5 font-semibold', c.key === 'name' ? 'text-left' : 'text-right')}
                    >
                      <button
                        type="button"
                        onClick={() => toggle(c.key)}
                        title={c.short}
                        className={cn(
                          'inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                          active && 'text-on-surface',
                        )}
                      >
                        {c.label}
                        <Icon className={cn('h-3 w-3', !active && 'opacity-40')} aria-hidden="true" />
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {sorted.map((r, i) => {
                const selected = r.agent._id === selectedAgent;
                return (
                  <tr
                    key={r.agent._id}
                    tabIndex={0}
                    onClick={() => onSelectAgent(r.agent._id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectAgent(r.agent._id);
                      }
                    }}
                    className={cn(
                      'cursor-pointer tabular-nums text-on-surface transition-colors hover:bg-surface-container focus-visible:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50',
                      selected && 'bg-primary/5',
                    )}
                  >
                    <td className="px-3 py-2 font-bold text-on-surface-variant">{i + 1}</td>
                    {COLUMNS.map((c) => (
                      <td key={c.key} className={cn('px-3 py-2', c.key === 'name' ? 'max-w-[12rem] truncate text-left font-semibold' : 'text-right')}>
                        {c.key === 'name' ? (
                          <>
                            {r.agent.name}
                            <span className="sr-only">{selected ? ' (current filter)' : ' (press Enter to filter by this agent)'}</span>
                          </>
                        ) : (
                          formatKpi(r[c.key], c.money ? 'money' : c.percent ? 'percent' : 'count')
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

export function LeaderboardSkeleton() {
  return (
    <Panel title="Agent leaderboard">
      <div className="space-y-2" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>
    </Panel>
  );
}
