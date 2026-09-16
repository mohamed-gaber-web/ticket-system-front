import { useMemo } from 'react';
import { useAppSelector } from './hooks';
import type { EmployeeRole, ModuleKey, RoleFamily, TeleSalesTeamRef } from '@/types/auth.types';
import { effectiveModules, isManagerRole, roleFamily, roleLabel } from '@/lib/access';

export interface Access {
  userType: 'employee' | 'customer' | null;
  isEmployee: boolean;
  isCustomer: boolean;
  /** Employee role, null for customers. */
  role: EmployeeRole | null;
  family: RoleFamily | null;
  roleLabel: string;
  isAdmin: boolean;
  isManager: boolean;
  isManagerOrAdmin: boolean;
  isSalesManager: boolean;
  /** Marketing family — reads tele-sales but may not change it. */
  isMarketing: boolean;
  /** Admins and sales managers: see and write every tele-sales team. */
  isCrossTeam: boolean;
  /** Admins and the development manager: see and shape every development board. */
  seesAllBoards: boolean;
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
    const resolved = isEmployee ? effectiveModules(role, modules) : [];
    const isAdmin = role === 'admin';
    const isManager = isManagerRole(role);
    const family = roleFamily(role);
    const rawTeam = (user as any)?.teleSalesTeam ?? (user as any)?.team ?? null;
    const teleSalesTeam =
      rawTeam && typeof rawTeam === 'object' ? (rawTeam as TeleSalesTeamRef) : null;

    return {
      userType,
      isEmployee,
      isCustomer: userType === 'customer',
      role,
      family,
      roleLabel: roleLabel(role),
      isAdmin,
      isManager,
      isManagerOrAdmin: isAdmin || isManager,
      isSalesManager: role === 'sales_manager',
      isMarketing: family === 'marketing',
      isCrossTeam: isAdmin || role === 'sales_manager',
      seesAllBoards: isAdmin || role === 'developer_manager',
      modules: resolved,
      hasModule: (m: ModuleKey) => resolved.includes(m),
      teleSalesTeam,
    };
  }, [userType, consultantRole, modules, user]);
};
