import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Globe, LayoutDashboard, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTeleSalesDashboard } from '@/redux/slices/teleSalesDashboardSlice';
import { useTeamAgents } from '@/hooks/useTeamAgents';
import { isCrossTeamReader, ownTeamNames, ownTeams } from '@/lib/teleSalesRole';
import { readDashboardFilters, type PeriodPreset } from '@/lib/teleSalesDashboard';
import type { DashboardRef, TeleSalesDashboardData, TeleSalesDashboardParams } from '@/types/teleSales.types';
import { DashboardFilters } from '@/components/tele-sales/dashboard/DashboardFilters';
import { EmptyNote, ErrorBlock } from '@/components/tele-sales/dashboard/DashboardUi';
import { KpiGrid, KpiGridSkeleton } from '@/components/tele-sales/dashboard/KpiGrid';
import { SnapshotStrip, SnapshotStripSkeleton } from '@/components/tele-sales/dashboard/SnapshotStrip';
import { FunnelCard, FunnelSkeleton } from '@/components/tele-sales/dashboard/FunnelCard';
import { TrendChart, TrendSkeleton } from '@/components/tele-sales/dashboard/TrendChart';
import { Leaderboard, LeaderboardSkeleton } from '@/components/tele-sales/dashboard/Leaderboard';
import { ActionLists, ActionListsSkeleton } from '@/components/tele-sales/dashboard/ActionLists';
import { PipelineByStatus, PipelineByStatusSkeleton } from '@/components/tele-sales/dashboard/PipelineByStatus';

type UrlPatch = Record<string, string | null>;

const periodIsQuiet = (d: TeleSalesDashboardData) => Object.values(d.kpis).every((k) => !k.value);

/**
 * Tele-sales dashboard: period / team / agent filters (in the URL), KPIs vs the
 * previous period, funnel, leaderboard, 12-week trend, action lists and the
 * pipeline by status. Scope (which records count) is decided by the API.
 */
export default function TeleSalesDashboard() {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAppSelector((s) => s.auth.user);
  const { data, status, error } = useAppSelector((s) => s.teleSalesDashboard);

  const filters = useMemo(() => readDashboardFilters(searchParams), [searchParams]);
  const crossTeam = isCrossTeamReader(user);

  const params = useMemo<TeleSalesDashboardParams>(
    () => ({ from: filters.from, to: filters.to, team: filters.team || undefined, agent: filters.agent || undefined }),
    [filters.from, filters.to, filters.team, filters.agent],
  );

  const load = useCallback(() => {
    if (!filters.rangeError) void dispatch(fetchTeleSalesDashboard(params));
  }, [dispatch, params, filters.rangeError]);

  useEffect(() => {
    load();
  }, [load]);

  const patchUrl = useCallback(
    (patch: UrlPatch) =>
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v) next.set(k, v);
            else next.delete(k);
          }
          return next;
        },
        { replace: true },
      ),
    [setSearchParams],
  );

  const onPreset = (preset: PeriodPreset) =>
    preset === 'custom'
      ? patchUrl({ period: null, from: filters.from, to: filters.to })
      : patchUrl({ period: preset, from: null, to: null });
  const onCustom = (from: string, to: string) => patchUrl({ period: null, from, to });
  // A different team means a different roster — the agent filter goes with it.
  const onTeam = (team: string) => patchUrl({ team: team || null, agent: null });
  const onAgent = (agent: string) => patchUrl({ agent: agent || null });
  const onLeaderboardAgent = (agent: string) => patchUrl({ agent: agent === filters.agent ? null : agent });

  // Team options: what the API says the caller may pick; the user's own teams until it answers.
  const teams: DashboardRef[] = data?.filters.teams ?? (crossTeam ? [] : ownTeams(user));
  const showTeam = crossTeam || teams.length > 1;
  const canFilterAgent = !!data?.filters.canFilterAgent;

  // Agent options: the chosen team's roster, otherwise the agents on the
  // leaderboard of the last unfiltered (all agents) answer.
  const { agents: teamAgents, loading: agentsLoading } = useTeamAgents(canFilterAgent && filters.team ? filters.team : null);
  const [boardAgents, setBoardAgents] = useState<DashboardRef[]>([]);
  useEffect(() => {
    if (data && !data.filters.agent && data.leaderboard) setBoardAgents(data.leaderboard.map((r) => r.agent));
  }, [data]);
  const agentOptions: DashboardRef[] = filters.team
    ? teamAgents.map((a) => ({ _id: a._id, name: a.fullName || `${a.firstName} ${a.lastName}`.trim() }))
    : [...boardAgents].sort((a, b) => a.name.localeCompare(b.name));

  const u = user as { firstName?: string; lastName?: string } | null;
  const greetingName = u?.firstName ? `${u.firstName} ${u.lastName ?? ''}`.trim() : 'Agent';
  const selectedTeamName = filters.team ? teams.find((t) => t._id === filters.team)?.name : undefined;
  const badge = selectedTeamName ?? (crossTeam ? 'All teams' : ownTeamNames(user));

  const firstLoad = !data && !filters.rangeError && status !== 'failed';
  const refreshing = !!data && status === 'loading';

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* Header */}
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-on-surface">Welcome back, {greetingName}</h1>
          {/* Every number below is scoped; naming the scope stops it being read as company-wide. */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Globe className="h-3 w-3" aria-hidden="true" />
            {badge || 'My team'}
          </span>
        </div>
        <p className="mt-1 text-sm text-on-surface-variant">
          {crossTeam
            ? "Here's the TeleSales overview across every team"
            : ownTeams(user).length > 1
              ? "Here's the TeleSales overview of your teams"
              : "Here's your team's TeleSales overview"}
        </p>
      </header>

      <DashboardFilters
        filters={filters}
        period={data?.period ?? null}
        teams={teams}
        showTeam={showTeam}
        showAgent={canFilterAgent}
        agents={agentOptions}
        agentsLoading={agentsLoading}
        refreshing={refreshing}
        onPreset={onPreset}
        onCustom={onCustom}
        onTeam={onTeam}
        onAgent={onAgent}
      />

      {status === 'failed' && !data && <ErrorBlock message={error ?? 'Could not load the dashboard'} onRetry={load} />}

      {!data && filters.rangeError && (
        <div className="rounded-2xl bg-surface-container-lowest">
          <EmptyNote icon={<SearchX className="h-5 w-5" />} title="Pick a valid date range" hint={filters.rangeError} />
        </div>
      )}

      {firstLoad && (
        <div className="space-y-5" aria-busy="true" aria-label="Loading the dashboard">
          <SnapshotStripSkeleton />
          <KpiGridSkeleton />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            <FunnelSkeleton />
            <TrendSkeleton />
          </div>
          <LeaderboardSkeleton />
          <ActionListsSkeleton />
          <PipelineByStatusSkeleton />
        </div>
      )}

      {data && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          aria-busy={refreshing}
          className={`space-y-5 transition-opacity ${refreshing ? 'opacity-60' : ''}`}
        >
          {status === 'failed' && <ErrorBlock compact message={`${error ?? 'Could not load the dashboard'} — showing the last loaded figures.`} onRetry={load} />}

          <SnapshotStrip snapshot={data.snapshot} ownTeamsOnly={!crossTeam} />

          {periodIsQuiet(data) && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
              <span className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden="true" />
                No activity in this period for this filter.
              </span>
              {filters.preset !== 'year' && (
                <Button variant="outline" size="sm" onClick={() => onPreset('year')}>
                  Show this year
                </Button>
              )}
            </div>
          )}

          <KpiGrid kpis={data.kpis} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            <FunnelCard funnel={data.funnel} />
            <TrendChart trend={data.trend} />
          </div>

          {data.leaderboard && <Leaderboard rows={data.leaderboard} selectedAgent={filters.agent} onSelectAgent={onLeaderboardAgent} />}

          <ActionLists actions={data.actions} />

          <PipelineByStatus byStatus={data.snapshot.byStatus} />
        </motion.div>
      )}
    </div>
  );
}
