import type { EmployeeRole, ModuleKey, RoleFamily } from '@/types/auth.types';

/**
 * Client-side mirror of the backend's src/utils/access.js — the one place that
 * knows what a role means. The API is the authority (every route re-checks);
 * this exists so the sidebar, route guards and buttons agree with it.
 */

export const ROLES: EmployeeRole[] = [
  'admin',
  'consultant',
  'sales',
  'sales_manager',
  'marketing',
  'marketing_manager',
  'developer',
  'developer_manager',
];

export const MODULES: ModuleKey[] = ['tickets', 'telesales', 'tasks', 'admin', 'development', 'hr'];

export const ROLE_DEFAULT_MODULES: Record<EmployeeRole, ModuleKey[]> = {
  admin: MODULES,
  consultant: ['tickets'],
  sales: ['telesales'],
  sales_manager: ['telesales'],
  marketing: ['telesales', 'tasks'],
  marketing_manager: ['telesales', 'tasks'],
  developer: ['development'],
  developer_manager: ['development'],
};

export const ROLE_LABELS: Record<EmployeeRole, string> = {
  admin: 'Administrator',
  consultant: 'Consultant',
  sales: 'Sales',
  sales_manager: 'Sales Manager',
  marketing: 'Marketing',
  marketing_manager: 'Marketing Manager',
  developer: 'Developer',
  developer_manager: 'Development Manager',
};

export const MODULE_LABELS: Record<ModuleKey, string> = {
  tickets: 'Ticketing',
  telesales: 'Tele-sales',
  tasks: 'Tasks',
  admin: 'Administration',
  development: 'Development',
  hr: 'HR',
};

export const isEmployeeRole = (role: unknown): role is EmployeeRole =>
  typeof role === 'string' && (ROLES as string[]).includes(role);

/** `sales_manager` → 'sales'; unknown → null. */
export const roleFamily = (role: string | null | undefined): RoleFamily | null =>
  isEmployeeRole(role) ? (role.replace(/_manager$/, '') as RoleFamily) : null;

export const isManagerRole = (role: string | null | undefined): boolean =>
  isEmployeeRole(role) && role.endsWith('_manager');

export const roleLabel = (role: string | null | undefined): string =>
  isEmployeeRole(role) ? ROLE_LABELS[role] : role ? String(role) : '';

/** One role or several → the valid, de-duplicated list. */
const asRoles = (roles: string | readonly string[] | null | undefined): EmployeeRole[] =>
  [...new Set((Array.isArray(roles) ? roles : [roles]).filter(isEmployeeRole))];

/**
 * Every role an employee holds — the primary `role` plus `extraRoles` — the
 * mirror of the server's rolesOf. Access ORs across all of them.
 */
export const rolesOf = (user: { role?: string | null; extraRoles?: string[] | null } | null | undefined): EmployeeRole[] =>
  asRoles([user?.role ?? '', ...(user?.extraRoles ?? [])]);

/**
 * The modules an employee may open: admins everything, otherwise the explicit
 * override when one exists, else the union of their roles' defaults. Same rule
 * as the server. Takes one role or the whole list.
 */
export const effectiveModules = (
  roles: string | readonly string[] | null | undefined,
  modules?: string[] | null,
): ModuleKey[] => {
  const list = asRoles(roles);
  if (list.length === 0) return [];
  if (list.includes('admin')) return [...MODULES];
  const explicit = (modules ?? []).filter((m): m is ModuleKey => (MODULES as string[]).includes(m));
  if (explicit.length) return explicit;
  return [...new Set(list.flatMap((r) => ROLE_DEFAULT_MODULES[r]))];
};

/**
 * Holds a module that opens other people's data (`hr`, `admin`). Only an admin
 * may manage such an account — same rule as the API's holdsPrivilegedModule.
 */
export const holdsPrivilegedModule = (roles: string | readonly string[] | null | undefined, modules?: string[] | null): boolean =>
  effectiveModules(roles, modules).some((m) => m === 'hr' || m === 'admin');

/** Role labels for a list of roles, primary first: "Sales Manager, Developer". */
export const rolesLabel = (roles: readonly string[]): string => roles.map(roleLabel).filter(Boolean).join(', ');

/** Where an employee lands after login, by module priority. */
export const homePathFor = (modules: ModuleKey[]): string => {
  if (modules.includes('tickets')) return '/';
  if (modules.includes('telesales')) return '/tele-sales';
  if (modules.includes('tasks')) return '/tasks/dashboard';
  if (modules.includes('development')) return '/development';
  if (modules.includes('hr')) return '/hr/employees';
  return '/employee-requests';
};
