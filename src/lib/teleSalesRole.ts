import { teamId, teamName } from '@/types/teleSales.types';

/**
 * Role predicates for the tele-sales module, mirroring
 * `src/utils/teleSalesScope.js` on the backend.
 *
 * These decide what the UI *offers*, never what is *allowed* — the server makes
 * that call on every request. Keeping them in one place stops the screens that
 * branch on role from drifting apart, which is how a stale `role === 'admin'`
 * check ends up hiding a control a team manager is entitled to use.
 *
 * The parameter is `unknown` because the auth slice stores the logged-in user as
 * a union of four unrelated user types, none of which declares the tele-sales
 * fields. Narrowing here rather than widening that union keeps the change local.
 */
type MaybeUser = unknown;

/** Works across every team. */
export const isSuperAdmin = (user: MaybeUser): boolean => (user as any)?.role === 'admin';

/** Head of one team: full control inside it, no visibility outside it. */
export const isTeamManager = (user: MaybeUser): boolean => (user as any)?.role === 'manager';

/**
 * May act on the team's data as a whole — reassign leads between agents, delete
 * them, manage the roster. True for managers and super admins.
 */
export const canManageTeam = (user: MaybeUser): boolean => isSuperAdmin(user) || isTeamManager(user);

/**
 * The caller's own team reference.
 *
 * Tele-sales agents carry `team`; consultants who reach the module carry
 * `teleSalesTeam`. Both are checked here for the same reason `callerTeamId` does
 * on the backend — a sales-department consultant has only the second one, and
 * reading just `team` would report them as having no team at all.
 */
const ownTeamRef = (user: MaybeUser) => (user as any)?.team ?? (user as any)?.teleSalesTeam;

/** The caller's own team id, or '' for a super admin with no home team. */
export const ownTeamId = (user: MaybeUser): string => teamId(ownTeamRef(user));

/** The caller's own team name, for the header badge. */
export const ownTeamName = (user: MaybeUser): string => teamName(ownTeamRef(user));
