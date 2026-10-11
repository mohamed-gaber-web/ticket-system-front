import { useEffect, useState } from 'react';
import { AlertCircle, FlaskConical, RotateCw, Save } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchDepartments } from '@/redux/slices/departmentSlice';
import { fetchTicketSettings, saveTicketSettings } from '@/redux/slices/ticketSettingsSlice';
import { useTicketSettings } from '@/redux/hooks/useTicketSettings';
import { Button } from '@/components/ui/button';
import { CustomSelect } from '@/components/ui/custom-select';

const NO_DEPARTMENT = '';

/**
 * Ticketing Setup → R&D Settings (admins). Picks the one department that, with
 * the admins, may see R&D tickets.
 */
export default function TicketSettingsPage() {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((s) => s.auth.user?._id ?? null);
  const { departments, loading: departmentsLoading, error: departmentsError } = useAppSelector((s) => s.departments);
  const saving = useAppSelector((s) => s.ticketSettings.saving);
  const { rndDepartment, ready, error } = useTicketSettings();

  const [department, setDepartment] = useState(NO_DEPARTMENT);

  useEffect(() => {
    dispatch(fetchDepartments({ limit: 1000 }));
  }, [dispatch]);

  // Show the saved choice once it is known
  const savedId = rndDepartment?._id ?? NO_DEPARTMENT;
  useEffect(() => {
    if (ready) setDepartment(savedId);
  }, [ready, savedId]);

  const retry = () => {
    if (userId) dispatch(fetchTicketSettings({ userId, force: true }));
    dispatch(fetchDepartments({ limit: 1000 }));
  };

  const save = () => {
    dispatch(saveTicketSettings({ rndDepartment: department || null }));
  };

  const options = [
    { value: NO_DEPARTMENT, label: 'None — admins only' },
    ...departments
      .filter((d) => d.isActive || d._id === savedId)
      .map((d) => ({ value: d._id, label: d.name })),
  ];

  const loadFailed = (ready && error) || departmentsError;
  const isLoading = !ready || (departmentsLoading && departments.length === 0);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="display-sm text-on-surface">R&amp;D Settings</h1>
        <p className="text-on-surface-variant mt-1">Who may see R&amp;D tickets, their list and their dashboard</p>
      </div>

      <section
        aria-labelledby="rnd-settings-title"
        className="bg-surface-container-lowest rounded-[1rem] p-6 space-y-5 max-w-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 rounded-[0.75rem] bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center">
            <FlaskConical className="h-5 w-5 text-purple-700 dark:text-purple-300" aria-hidden="true" />
          </div>
          <div>
            <h2 id="rnd-settings-title" className="text-base font-semibold text-on-surface">R&amp;D department</h2>
            <p className="text-sm text-on-surface-variant mt-0.5">
              Admins always see R&amp;D tickets. Employees of the department chosen here see them too; everyone else
              never does — the R&amp;D menu items are hidden and the API refuses the tickets.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2" role="status" aria-label="Loading R&D settings">
            <div className="h-4 w-32 rounded bg-surface-container-high animate-pulse" />
            <div className="h-10 w-full rounded-[0.75rem] bg-surface-container-high animate-pulse" />
          </div>
        ) : loadFailed ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[0.75rem] bg-error/10 px-4 py-3" role="alert">
            <p className="flex items-center gap-2 text-sm text-error">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {error || departmentsError || 'Could not load the settings.'}
            </p>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={retry}>
              <RotateCw className="h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              {/* `label` names the control for screen readers and prefixes the trigger */}
              <CustomSelect
                value={department}
                onChange={setDepartment}
                options={options}
                label="Department"
                placeholder="None — admins only"
              />
              {departments.length === 0 && (
                <p className="text-xs text-on-surface-variant">No departments yet — add one under Ticketing Setup → Departments.</p>
              )}
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={save} disabled={saving || department === savedId} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
