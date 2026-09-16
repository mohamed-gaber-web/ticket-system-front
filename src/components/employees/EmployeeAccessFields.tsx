import { useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { useAccess } from '@/redux/hooks/useAccess';
import { fetchTeams } from '@/redux/slices/teleSalesTeamsSlice';
import { CustomSelect } from '@/components/ui/custom-select';
import {
  MODULES,
  MODULE_LABELS,
  ROLES,
  ROLE_LABELS,
  ROLE_DEFAULT_MODULES,
  roleFamily,
} from '@/lib/access';
import type { EmployeeRole, ModuleKey } from '@/types/auth.types';
import { ShieldCheck } from 'lucide-react';

export interface EmployeeAccessValue {
  role: EmployeeRole;
  department?: string | null;
  teleSalesTeam?: string | null;
  modules?: ModuleKey[];
}

interface Props {
  value: EmployeeAccessValue;
  onChange: (next: EmployeeAccessValue) => void;
  departments: { _id: string; name: string }[];
}

const ROLE_HINTS: Record<EmployeeRole, string> = {
  admin: 'Every module, every team; manages everyone.',
  consultant: 'Ticketing only.',
  sales: 'Tele-sales, inside one team.',
  sales_manager: 'Tele-sales across every team; runs the sales people.',
  marketing: 'Tele-sales (read-only, every team) and Tasks.',
  marketing_manager: 'The same as marketing, and runs the marketing people.',
  developer: 'Development boards they create or are added to.',
  developer_manager: 'Every development board; runs the developer people.',
};

/**
 * The access section of the employee form — role, department, tele-sales
 * team and the admin-only module override. Shared by create and edit so the
 * two screens cannot disagree about what a role means.
 *
 * What is offered follows the caller: an admin may assign any role and tick
 * modules; a manager may only create the plain role of their own family and
 * never sees the module override (the API strips it anyway).
 */
export function EmployeeAccessFields({ value, onChange, departments }: Props) {
  const dispatch = useAppDispatch();
  const access = useAccess();
  const { teams } = useAppSelector((s) => s.teleSalesTeams);

  const family = roleFamily(value.role);
  const isSalesFamily = family === 'sales';
  const departmentIsDerived = family === 'sales' || family === 'marketing';

  // Only the sales family needs the team list
  useEffect(() => {
    if (isSalesFamily && teams.length === 0) dispatch(fetchTeams(undefined));
  }, [isSalesFamily, teams.length, dispatch]);

  const roleOptions = useMemo(() => {
    const allowed: EmployeeRole[] = access.isAdmin
      ? ROLES
      : access.family
        ? [access.family as EmployeeRole]
        : [];
    return allowed.map((r) => ({ value: r, label: ROLE_LABELS[r] }));
  }, [access.isAdmin, access.family]);

  const defaults = ROLE_DEFAULT_MODULES[value.role] ?? [];
  const overridden = (value.modules ?? []).length > 0;
  // What the checkboxes show: the override when there is one, else the defaults
  const shown = overridden ? (value.modules as ModuleKey[]) : defaults;

  const setRole = (role: EmployeeRole) =>
    onChange({
      ...value,
      role,
      // A department only makes sense for consultants/admins; sales and
      // marketing are filed automatically. A team only for the sales family.
      department: roleFamily(role) === 'sales' || roleFamily(role) === 'marketing' ? undefined : value.department,
      teleSalesTeam: roleFamily(role) === 'sales' ? value.teleSalesTeam : null,
      // A role change resets the override to the new role's defaults
      modules: [],
    });

  const toggleModule = (m: ModuleKey) => {
    const next = shown.includes(m) ? shown.filter((x) => x !== m) : [...shown, m];
    // If the result equals the defaults again, store no override at all
    const same = next.length === defaults.length && defaults.every((d) => next.includes(d));
    onChange({ ...value, modules: same ? [] : next });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">Role</label>
          <CustomSelect
            value={value.role}
            onChange={(val) => setRole(val as EmployeeRole)}
            options={roleOptions}
          />
          <p className="text-xs text-on-surface-variant mt-1">{ROLE_HINTS[value.role]}</p>
        </div>

        {isSalesFamily && (
          <div>
            <label className="form-label">
              Tele-sales Team{value.role === 'sales' ? ' *' : ''}
            </label>
            <CustomSelect
              value={value.teleSalesTeam ?? ''}
              onChange={(val) => onChange({ ...value, teleSalesTeam: val || null })}
              options={[
                { value: '', label: value.role === 'sales' ? 'Select a team' : 'None (works across every team)' },
                ...teams.filter((t) => t.isActive !== false).map((t) => ({ value: t._id, label: t.name })),
              ]}
            />
            <p className="text-xs text-on-surface-variant mt-1">
              {value.role === 'sales'
                ? 'An agent only ever sees the leads of this team.'
                : 'Optional home team — the default owner of leads this manager creates.'}
            </p>
          </div>
        )}

        {!departmentIsDerived && access.isAdmin && (
          <div>
            <label className="form-label">Department</label>
            <CustomSelect
              value={value.department ?? ''}
              onChange={(val) => onChange({ ...value, department: val || undefined })}
              options={[
                { value: '', label: 'None' },
                ...departments.map((d) => ({ value: d._id, label: d.name })),
              ]}
            />
          </div>
        )}
      </div>

      {access.isAdmin && value.role !== 'admin' && (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-on-surface">Modules this employee can open</span>
            {overridden ? (
              <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full bg-amber-100 text-amber-800 px-2 py-0.5">
                custom
              </span>
            ) : (
              <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full bg-surface-container-high text-on-surface-variant px-2 py-0.5">
                role default
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {MODULES.map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm text-on-surface cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={shown.includes(m)}
                  onChange={() => toggleModule(m)}
                  className="h-4 w-4 rounded border-outline-variant accent-primary"
                />
                {MODULE_LABELS[m]}
              </label>
            ))}
          </div>
          <p className="text-xs text-on-surface-variant mt-3">
            Untick or tick to override the role's defaults for this person only. Matching the defaults again clears the override.
          </p>
        </div>
      )}
    </div>
  );
}
