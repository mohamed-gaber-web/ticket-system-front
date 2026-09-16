import { teamId, teamName } from '@/types/teleSales.types';
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
 *   sales          → agent: their own team, writes own + unassigned leads
 *   sales_manager  → every team, writes everything, manages the sales roster
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

/** Runs the whole sales department. */
export const isSalesManager = (user: MaybeUser): boolean => roleOf(user) === 'sales_manager';

/** Marketing reads every team's pipeline but may not change it. */
export const isReadOnly = (user: MaybeUser): boolean => roleFamily(roleOf(user)) === 'marketing';

/**
 * Works across every team with full write access: admins and the sales
 * manager. Kept under its historical name — every tele-sales screen already
 * uses it to mean "may choose the team and sees all of them".
 */
export const isSuperAdmin = (user: MaybeUser): boolean => isSystemAdmin(user) || isSalesManager(user);

/** Sees every team (read or write): admins, sales manager, marketing. */
export const isCrossTeamReader = (user: MaybeUser): boolean => isSuperAdmin(user) || isReadOnly(user);

/**
 * May act on the pipeline as a whole — reassign leads between agents, delete
 * them, manage the roster. Admins and the sales manager.
 */
export const canManageTeam = (user: MaybeUser): boolean => isSuperAdmin(user);

/** The caller's own team reference (employees carry `teleSalesTeam`; `team` is the compat alias). */
const ownTeamRef = (user: MaybeUser) => (user as any)?.teleSalesTeam ?? (user as any)?.team;

/** The caller's own team id, or '' for a cross-team user with no home team. */
export const ownTeamId = (user: MaybeUser): string => teamId(ownTeamRef(user));

/** The caller's own team name, for the header badge. */
export const ownTeamName = (user: MaybeUser): string => teamName(ownTeamRef(user));
