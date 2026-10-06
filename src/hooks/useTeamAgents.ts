import { useEffect, useState } from 'react';
import * as teleSalesApi from '@/api/teleSalesApi';
import type { TeleSalesAgent } from '@/types/teleSales.types';

// One roster request per team per minute, shared by every picker on screen
// (lead form, import, filters, bulk reassign).
const TTL_MS = 60_000;
const cache = new Map<string, { at: number; request: Promise<TeleSalesAgent[]> }>();

function loadTeamAgents(teamId: string): Promise<TeleSalesAgent[]> {
  const hit = cache.get(teamId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.request;
  const request = teleSalesApi
    .getAgents({ team: teamId, status: 'active', limit: 200 })
    .then((r) => r.data)
    .catch((err) => {
      cache.delete(teamId); // don't keep a failure around
      throw err;
    });
  cache.set(teamId, { at: Date.now(), request });
  return request;
}

/**
 * The active employees on one tele-sales team — the options of every Agent
 * picker that depends on a Team field. No team → no agents (the picker asks for a
 * team first). The API only returns teams the caller may see.
 */
export function useTeamAgents(teamId?: string | null) {
  const [agents, setAgents] = useState<TeleSalesAgent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!teamId) {
      setAgents([]);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    loadTeamAgents(teamId)
      .then((list) => { if (alive) setAgents(list); })
      .catch(() => { if (alive) setAgents([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [teamId]);

  return { agents, loading };
}
