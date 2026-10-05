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
  /** The tele-sales teams this employee sees — Team A, Team B, or both. */
  teleSalesTeams?: string[];
  modules?: ModuleKey[];
}

interface Props {
  value: EmployeeAccessValue;
  onChange: (next: EmployeeAccessValue) => void;
  departments: { _id: string; name: string }[];
  /** Validation message for the tele-sales teams (sales and sales managers need one). */
  teamError?: string;
}

const ROLE_HINTS: Record<EmployeeRole, string> = {
  admin: 'Every module, every team; manages everyone.',
  consultant: 'Ticketing only.',
  sales: 'Tele-sales: every lead of the teams ticked below; imports leads.',
  sales_manager: 'Tele-sales: the teams ticked below — all their leads, assigns, their sales people.',
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
 * modules; HR may assign any role but admin; a manager may only create the
 * plain role of their own family. Only admins see the module override (the API
 * strips it for everyone else).
 */
export function EmployeeAccessFields({ value, onChange, departments, teamError }: Props) {
  const dispatch = useAppDispatch();
  const access = useAccess();
  const { teams, loading: teamsLoading } = useAppSelector((s) => s.teleSalesTeams);

  const family = roleFamily(value.role);
  const isSalesFamily = family === 'sales';
  const departmentIsDerived = family === 'sales' || family === 'marketing';

  // Only the sales family needs the team list. Fetched every time a sales role
  // is picked (not only while empty), so a team created meanwhile shows up.
  useEffect(() => {
    if (isSalesFamily) dispatch(fetchTeams(undefined));
  }, [isSalesFamily, dispatch]);
  const ticked = value.teleSalesTeams ?? [];
  // Active teams, plus any inactive one still ticked so it can be unticked
  const shownTeams = teams.filter((t) => t.isActive !== false || ticked.includes(t._id));
  const activeTeams = teams.filter((t) => t.isActive !== false);
  const toggleTeam = (id: string) =>
    onChange({ ...value, teleSalesTeams: ticked.includes(id) ? ticked.filter((t) => t !== id) : [...ticked, id] });

  // Same rule as the API's assignableRoles: admin → any role, HR → any but
  // admin, a manager → the plain role of their own family.
  const roleOptions = useMemo(() => {
    const allowed: EmployeeRole[] = access.isAdmin
      ? [...ROLES]
      : access.isHr
        ? ROLES.filter((r) => r !== 'admin')
        : access.family
          ? [access.family as EmployeeRole]
          : [];
    // Keep the current role visible even when the caller may not hand it out
    if (!allowed.includes(value.role)) allowed.unshift(value.role);
    return allowed.map((r) => ({ value: r, label: ROLE_LABELS[r] }));
  }, [access.isAdmin, access.isHr, access.family, value.role]);

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
      teleSalesTeams: roleFamily(role) === 'sales' ? value.teleSalesTeams : [],
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
              Tele-sales Teams<span className="required">*</span>
            </label>
            <div className={`rounded-xl border p-3 space-y-2 ${teamError ? 'border-error' : 'border-outline-variant/40'}`}>
              {teamsLoading && shownTeams.length === 0 && (
                <p className="text-sm text-on-surface-variant">Loading teams…</p>
              )}
              {shownTeams.map((t) => (
                <label key={t._id} className="flex items-center gap-2 text-sm text-on-surface cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={ticked.includes(t._id)}
                    onChange={() => toggleTeam(t._id)}
                    className="h-4 w-4 rounded border-outline-variant accent-primary"
                  />
                  {t.name}
                  {t.code && <span className="text-xs text-on-surface-variant">({t.code})</span>}
                  {t.isActive === false && <span className="text-xs text-amber-700">inactive</span>}
                </label>
              ))}
            </div>
            {!teamsLoading && activeTeams.length === 0 && (
              <p className="text-xs text-amber-700 mt-1">
                No active tele-sales teams yet — an administrator creates them under TeleSales → Teams.
              </p>
            )}
            {teamError ? (
              <p className="form-error">{teamError}</p>
            ) : (
              <p className="text-xs text-on-surface-variant mt-1">
                {value.role === 'sales'
                  ? 'The agent sees every lead of the ticked teams — other teams stay hidden.'
                  : 'The manager sees and runs the ticked teams only — other teams stay hidden.'}
              </p>
            )}
          </div>
        )}

        {!departmentIsDerived && (access.isAdmin || access.isHr) && (
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
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
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
