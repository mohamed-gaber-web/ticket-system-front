import { useMemo } from 'react';
import { useAppSelector } from './hooks';
import type { EmployeeRole, ModuleKey, RoleFamily, TeleSalesTeamRef } from '@/types/auth.types';
import { effectiveModules, isManagerRole, roleFamily, roleLabel, rolesOf, rolesLabel } from '@/lib/access';

export interface Access {
  userType: 'employee' | 'customer' | null;
  isEmployee: boolean;
  isCustomer: boolean;
  /** Primary employee role, null for customers. */
  role: EmployeeRole | null;
  /** Every role held (primary first); the predicates below OR across them. */
  roles: EmployeeRole[];
  /** The primary role's family. */
  family: RoleFamily | null;
  /** Every family the roles belong to. */
  families: RoleFamily[];
  roleLabel: string;
  isAdmin: boolean;
  isManager: boolean;
  isManagerOrAdmin: boolean;
  isSalesManager: boolean;
  /** Marketing family — reads tele-sales but may not change it. */
  isMarketing: boolean;
  /** Admins only: see and write every tele-sales team (a sales manager runs one). */
  isCrossTeam: boolean;
  /** Admins and the development manager: see and shape every development board. */
  seesAllBoards: boolean;
  /** Has the HR module (admins always do): sees and edits the confidential HR file. */
  isHr: boolean;
  /** May open the employee directory and its create/edit screens: admins and HR. */
  canManageEmployees: boolean;
  modules: ModuleKey[];
  hasModule: (m: ModuleKey) => boolean;
  teleSalesTeam: TeleSalesTeamRef | null;
}

/**
 * Everything a component needs to decide what to show for the current user.
 * Mirrors the server's access.js; the server still has the final say.
 */
export const useAccess = (): Access => {
  const { userType, consultantRole, modules, user } = useAppSelector((s) => s.auth);

  return useMemo(() => {
    const isEmployee = userType === 'employee';
    const role = isEmployee ? consultantRole : null;
    // Multi-role employees: the primary role plus the extra ones on the profile.
    const roles = isEmployee ? rolesOf({ role, extraRoles: (user as { extraRoles?: string[] } | null)?.extraRoles }) : [];
    const resolved = isEmployee ? effectiveModules(roles, modules) : [];
    const isAdmin = roles.includes('admin');
    const isManager = roles.some(isManagerRole);
    const family = roleFamily(role);
    const families = [...new Set(roles.map(roleFamily).filter((f): f is RoleFamily => !!f))];
    const rawTeam = (user as any)?.teleSalesTeam ?? (user as any)?.team ?? null;
    const teleSalesTeam =
      rawTeam && typeof rawTeam === 'object' ? (rawTeam as TeleSalesTeamRef) : null;

    return {
      userType,
      isEmployee,
      isCustomer: userType === 'customer',
      role,
      roles,
      family,
      families,
      roleLabel: roles.length > 1 ? rolesLabel(roles) : roleLabel(role),
      isAdmin,
      isManager,
      isManagerOrAdmin: isAdmin || isManager,
      isSalesManager: roles.includes('sales_manager'),
      isMarketing: families.includes('marketing'),
      isCrossTeam: isAdmin,
      seesAllBoards: isAdmin || roles.includes('developer_manager'),
      isHr: resolved.includes('hr'),
      canManageEmployees: isAdmin || resolved.includes('hr'),
      modules: resolved,
      hasModule: (m: ModuleKey) => resolved.includes(m),
      teleSalesTeam,
    };
  }, [userType, consultantRole, modules, user]);
};
