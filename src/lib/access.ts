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
];

export const MODULES: ModuleKey[] = ['tickets', 'telesales', 'tasks', 'admin'];

export const ROLE_DEFAULT_MODULES: Record<EmployeeRole, ModuleKey[]> = {
  admin: MODULES,
  consultant: ['tickets'],
  sales: ['telesales'],
  sales_manager: ['telesales'],
  marketing: ['telesales', 'tasks'],
  marketing_manager: ['telesales', 'tasks'],
};

export const ROLE_LABELS: Record<EmployeeRole, string> = {
  admin: 'Administrator',
  consultant: 'Consultant',
  sales: 'Sales',
  sales_manager: 'Sales Manager',
  marketing: 'Marketing',
  marketing_manager: 'Marketing Manager',
};

export const MODULE_LABELS: Record<ModuleKey, string> = {
  tickets: 'Ticketing',
  telesales: 'Tele-sales',
  tasks: 'Tasks',
  admin: 'Administration',
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

/**
 * The modules an employee may open: admins everything, otherwise the explicit
 * override when one exists, else the role defaults. Same rule as the server.
 */
export const effectiveModules = (
  role: string | null | undefined,
  modules?: string[] | null,
): ModuleKey[] => {
  if (!isEmployeeRole(role)) return [];
  if (role === 'admin') return [...MODULES];
  const explicit = (modules ?? []).filter((m): m is ModuleKey => (MODULES as string[]).includes(m));
  if (explicit.length) return explicit;
  return [...ROLE_DEFAULT_MODULES[role]];
};

/** Where an employee lands after login, by module priority. */
export const homePathFor = (modules: ModuleKey[]): string => {
  if (modules.includes('tickets')) return '/';
  if (modules.includes('telesales')) return '/tele-sales';
  if (modules.includes('tasks')) return '/tasks/dashboard';
  return '/employee-requests';
};
