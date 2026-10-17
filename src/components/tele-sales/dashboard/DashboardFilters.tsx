import { useId } from 'react';
import { CalendarRange, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { PERIOD_PRESETS, cairoToday, fmtRange, type DashboardFilterState, type PeriodPreset } from '@/lib/teleSalesDashboard';
import type { DashboardRef } from '@/types/teleSales.types';

const ALL = '__all';

interface Props {
  filters: DashboardFilterState;
  /** The period the API answered for, with the previous period it compares against. */
  period: { from: string; to: string; prevFrom: string; prevTo: string } | null;
  teams: DashboardRef[];
  showTeam: boolean;
  showAgent: boolean;
  agents: DashboardRef[];
  agentsLoading: boolean;
  refreshing: boolean;
  onPreset: (preset: PeriodPreset) => void;
  onCustom: (from: string, to: string) => void;
  onTeam: (team: string) => void;
  onAgent: (agent: string) => void;
}

/**
 * Period presets, custom range, team and agent. Everything lives in the URL
 * (the page writes it), so a view can be bookmarked or shared.
 */
export function DashboardFilters({
  filters,
  period,
  teams,
  showTeam,
  showAgent,
  agents,
  agentsLoading,
  refreshing,
  onPreset,
  onCustom,
  onTeam,
  onAgent,
}: Props) {
  const fromId = useId();
  const toId = useId();
  const teamId = useId();
  const agentId = useId();
  const today = cairoToday();

  // The selected agent stays labelled even when it is not in the current list.
  const agentOptions =
    filters.agent && !agents.some((a) => a._id === filters.agent)
      ? [...agents, { _id: filters.agent, name: 'Selected agent' }]
      : agents;

  return (
    <div className="sticky top-0 z-20 -mx-1 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest/95 px-3 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-surface-container-lowest/85">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div role="group" aria-label="Period" className="flex flex-wrap gap-1.5">
          {PERIOD_PRESETS.map((p) => {
            const active = filters.preset === p.key;
            return (
              <button
                key={p.key}
                type="button"
                aria-pressed={active}
                onClick={() => onPreset(p.key)}
                className={cn(
                  'h-8 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface',
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {filters.preset === 'custom' && (
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={fromId} className="sr-only">
              From
            </label>
            <input
              id={fromId}
              type="date"
              value={filters.from}
              max={today}
              onChange={(e) => e.target.value && onCustom(e.target.value, filters.to)}
              className="h-8 rounded-lg bg-surface-container-high px-2 text-xs text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
            <span className="text-xs text-on-surface-variant" aria-hidden="true">
              to
            </span>
            <label htmlFor={toId} className="sr-only">
              To
            </label>
            <input
              id={toId}
              type="date"
              value={filters.to}
              max={today}
              onChange={(e) => e.target.value && onCustom(filters.from, e.target.value)}
              className="h-8 rounded-lg bg-surface-container-high px-2 text-xs text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </div>
        )}

        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          {showTeam && (
            <div className="w-full min-w-0 sm:w-44">
              <label htmlFor={teamId} className="sr-only">
                Team
              </label>
              <Select value={filters.team || ALL} onValueChange={(v) => onTeam(v === ALL ? '' : v)}>
                <SelectTrigger id={teamId} className="h-8 text-xs">
                  <SelectValue placeholder="All teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All teams</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t._id} value={t._id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {showAgent && (
            <div className="w-full min-w-0 sm:w-48">
              <label htmlFor={agentId} className="sr-only">
                Agent
              </label>
              <Select value={filters.agent || ALL} onValueChange={(v) => onAgent(v === ALL ? '' : v)}>
                <SelectTrigger id={agentId} className="h-8 text-xs" aria-busy={agentsLoading}>
                  <SelectValue placeholder="All agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All agents</SelectItem>
                  {agentOptions.map((a) => (
                    <SelectItem key={a._id} value={a._id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-on-surface-variant" aria-live="polite">
        <span className="inline-flex items-center gap-1 font-semibold text-on-surface">
          <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
          {fmtRange(filters.from, filters.to)}
        </span>
        {period && period.from === filters.from && period.to === filters.to && (
          <span>compared with {fmtRange(period.prevFrom, period.prevTo)}</span>
        )}
        <span>Cairo time</span>
        {filters.rangeError && (
          <span role="alert" className="font-semibold text-error">
            {filters.rangeError}
          </span>
        )}
        {refreshing && (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Updating…
          </span>
        )}
      </div>
    </div>
  );
}
