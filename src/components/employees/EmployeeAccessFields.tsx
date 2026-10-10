import { useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { useAccess } from '@/redux/hooks/useAccess';
import { fetchTeams } from '@/redux/slices/teleSalesTeamsSlice';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  MODULES,
  MODULE_LABELS,
  ROLES,
  ROLE_LABELS,
  effectiveModules,
  roleFamily,
} from '@/lib/access';
import type { EmployeeRole, ModuleKey } from '@/types/auth.types';
import { ShieldCheck } from 'lucide-react';

export interface EmployeeAccessValue {
  /** Every role the employee holds, primary first. Access ORs across all of them. */
  roles: EmployeeRole[];
  /** Every department id, primary first. Tasks are visible from any of them. */
  departmentIds: string[];
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
  consultant: 'Ticketing.',
  sales: 'Tele-sales: the records of the teams ticked below assigned to them; imports into Data.',
  sales_manager: 'Tele-sales: every record of the teams ticked below; assigns; runs their sales people.',
  marketing: 'Marketing (CSP, email campaign), Tele-sales (read-only, every team) and Tasks.',
  marketing_manager: 'The same as marketing, and runs the marketing people.',
  developer: 'Development boards they create or are added to.',
  developer_manager: 'Every development board; runs the developer people.',
};

/**
 * The access section of the employee form — roles, departments, tele-sales
 * teams and the admin-only module override. Shared by create and edit so the
 * two screens cannot disagree about what a role means.
 *
 * Several roles and departments may be picked; every permission ORs across them
 * (the API does the same). The first role picked is the primary one; admin, when
 * picked, always is. What is offered follows the caller: an admin may assign any
 * role and tick modules; HR may assign any role but admin. Only admins see the
 * module override (the API strips it for everyone else).
 */
export function EmployeeAccessFields({ value, onChange, departments, teamError }: Props) {
  const dispatch = useAppDispatch();
  const access = useAccess();
  const { teams, loading: teamsLoading } = useAppSelector((s) => s.teleSalesTeams);

  const roles = value.roles;
  const isSalesFamily = roles.some((r) => roleFamily(r) === 'sales');
  const derivedDepartments = [...new Set(roles.map(roleFamily).filter((f) => f === 'sales' || f === 'marketing'))];

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
  // admin. Roles already held stay listed (and removable) even when the caller
  // may not hand them out.
  const roleItems = useMemo(() => {
    const allowed: EmployeeRole[] = access.isAdmin
      ? [...ROLES]
      : access.isHr
        ? ROLES.filter((r) => r !== 'admin')
        : [];
    const shown = [...new Set([...allowed, ...roles])];
    return shown.map((r) => ({ _id: r, name: ROLE_LABELS[r] }));
  }, [access.isAdmin, access.isHr, roles]);

  const defaults = effectiveModules(roles, []);
  const overridden = (value.modules ?? []).length > 0;
  // What the checkboxes show: the override when there is one, else the defaults
  const shown = overridden ? (value.modules as ModuleKey[]) : defaults;

  const setRoles = (ids: string[]) => {
    if (ids.length === 0) return; // an employee always holds at least one role
    // Keep the current primary first while it is still picked.
    const next = (ids as EmployeeRole[]).slice().sort((a, b) => (a === roles[0] ? -1 : b === roles[0] ? 1 : 0));
    onChange({
      ...value,
      roles: next,
      // A team only means something for the sales family.
      teleSalesTeams: next.some((r) => roleFamily(r) === 'sales') ? value.teleSalesTeams : [],
      // A role change resets the override to the new roles' defaults
      modules: [],
    });
  };

  const setDepartments = (ids: string[]) => {
    const primary = value.departmentIds[0];
    const next = primary && ids.includes(primary) ? [primary, ...ids.filter((d) => d !== primary)] : ids;
    onChange({ ...value, departmentIds: next });
  };

  const toggleModule = (m: ModuleKey) => {
    const next = shown.includes(m) ? shown.filter((x) => x !== m) : [...shown, m];
    // If the result equals the defaults again, store no override at all
    const same = next.length === defaults.length && defaults.every((d) => next.includes(d));
    onChange({ ...value, modules: same ? [] : next });
  };

  const canEditAccess = access.isAdmin || access.isHr;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">Roles<span className="required">*</span></label>
          <MultiSelect
            items={roleItems}
            value={roles}
            onChange={setRoles}
            placeholder="Select one or more roles"
            searchPlaceholder="Search roles…"
          />
          <ul className="text-xs text-on-surface-variant mt-1.5 space-y-0.5">
            {roles.map((r, i) => (
              <li key={r}>
                <span className="font-medium text-on-surface">{ROLE_LABELS[r]}{i === 0 && roles.length > 1 ? ' (primary)' : ''}:</span> {ROLE_HINTS[r]}
              </li>
            ))}
          </ul>
          {roles.length > 1 && (
            <p className="text-xs text-on-surface-variant mt-1">
              The employee gets everything each role grants. Manager rights apply only to that manager's own family.
            </p>
          )}
        </div>

        {canEditAccess && (
          <div>
            <label className="form-label">Departments</label>
            <MultiSelect
              items={departments.map((d) => ({ _id: d._id, name: d.name }))}
              value={value.departmentIds}
              onChange={setDepartments}
              placeholder="Select one or more departments"
              searchPlaceholder="Search departments…"
              emptyMessage="No departments"
            />
            <p className="text-xs text-on-surface-variant mt-1">
              Tasks of every selected department are visible.
              {derivedDepartments.length > 0 && (
                <> {derivedDepartments.map((f) => (f === 'sales' ? 'Sales' : 'Marketing')).join(' and ')} is added automatically from the roles.</>
              )}
            </p>
          </div>
        )}

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
                No active tele-sales teams yet — an administrator creates them under HR → Teams.
              </p>
            )}
            {teamError ? (
              <p className="form-error">{teamError}</p>
            ) : (
              <p className="text-xs text-on-surface-variant mt-1">
                {roles.includes('sales_manager')
                  ? 'As sales manager they see and run the ticked teams only — other teams stay hidden.'
                  : 'They see their records in the ticked teams — other teams stay hidden.'}
              </p>
            )}
          </div>
        )}
      </div>

      {access.isAdmin && !roles.includes('admin') && (
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
                {roles.length > 1 ? 'roles default' : 'role default'}
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
            Untick or tick to override the roles' defaults for this person only. Matching the defaults again clears the override.
          </p>
        </div>
      )}
    </div>
  );
}
