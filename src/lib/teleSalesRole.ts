import { teamId, teamName, type TeamRef } from '@/types/teleSales.types';
import { roleFamily } from '@/lib/access';

/**
 * Role predicates for the tele-sales module, mirroring
 * `src/utils/teleSalesScope.js` on the backend.
 *
 * These decide what the UI *offers*, never what is *allowed* — the server makes
 * that call on every request. Keeping them in one place stops the screens that
 * branch on role from drifting apart.
 *
 * Role model (Employee.role):
 *   sales          → agent: every lead of their teams (the ones ticked on the employee); imports
 *   sales_manager  → the same, and assigns / deletes leads and runs those teams' roster
 *   marketing(_manager) → every team, READ-ONLY
 *   admin          → every team, writes everything, manages teams
 *
 * The parameter is `unknown` because the auth slice stores the logged-in user as
 * a union that does not declare the employee fields.
 */
type MaybeUser = unknown;

const roleOf = (user: MaybeUser): string | undefined => (user as any)?.role;

/** The system administrator — the only role that manages the teams themselves. */
export const isSystemAdmin = (user: MaybeUser): boolean => roleOf(user) === 'admin';

/** Runs their teams. */
export const isSalesManager = (user: MaybeUser): boolean => roleOf(user) === 'sales_manager';

/** Marketing reads every team's pipeline but may not change it. */
export const isReadOnly = (user: MaybeUser): boolean => roleFamily(roleOf(user)) === 'marketing';

/**
 * Works across every team with full write access: admins only. Kept under its
 * historical name — every tele-sales screen uses it to mean "may choose the
 * team and sees all of them".
 */
export const isSuperAdmin = (user: MaybeUser): boolean => isSystemAdmin(user);

/** Sees every team (read or write): admins and marketing. */
export const isCrossTeamReader = (user: MaybeUser): boolean => isSuperAdmin(user) || isReadOnly(user);

/**
 * May act on the pipeline as a whole — bulk-assign and reassign leads, delete
 * them, manage the roster. Admins, and the sales manager inside their teams.
 */
export const canManageTeam = (user: MaybeUser): boolean => isSystemAdmin(user) || isSalesManager(user);

/** The caller's own team reference (employees carry `teleSalesTeam`; `team` is the compat alias). */
const ownTeamRef = (user: MaybeUser) => (user as any)?.teleSalesTeam ?? (user as any)?.team;

/** The caller's own team id, or '' for a cross-team user with no home team. */
export const ownTeamId = (user: MaybeUser): string => teamId(ownTeamRef(user));

/** The caller's own team name, for the header badge. */
export const ownTeamName = (user: MaybeUser): string => teamName(ownTeamRef(user));

/**
 * Every team the caller sees — the home team first, then the other teams ticked
 * on their employee record — as `{ _id, name }`, de-duplicated.
 */
export const ownTeams = (user: MaybeUser): { _id: string; name: string }[] => {
  const ticked = ((user as { teleSalesTeams?: TeamRef[] } | null)?.teleSalesTeams) ?? [];
  const refs: TeamRef[] = [ownTeamRef(user), ...ticked];
  const seen = new Set<string>();
  const out: { _id: string; name: string }[] = [];
  for (const ref of refs) {
    const id = teamId(ref ?? undefined);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ _id: id, name: teamName(ref ?? undefined) || 'Team' });
  }
  return out;
};

/** The names of every team the caller sees, for the header badge ("Egypt · KSA"). */
export const ownTeamNames = (user: MaybeUser): string => ownTeams(user).map((t) => t.name).join(' · ');
