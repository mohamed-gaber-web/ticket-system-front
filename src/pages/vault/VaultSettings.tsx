import { useCallback, useEffect } from 'react';
import { Info } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchVaultSetup } from '@/redux/slices/vaultLookupsSlice';
import { LOOKUP_PANELS } from '@/lib/vaultSettings';
import { VaultLayout } from '@/components/vault/VaultLayout';
import { ClientsPanel, DepartmentsPanel, EmployeesPanel, LookupPanel } from '@/components/vault/VaultSettingsPanels';
import { ErrorState } from '@/components/vault/VaultUi';

/** Settings (admins only): every vault dropdown list, the clients and the employee roster. */
export default function VaultSettings() {
  const dispatch = useAppDispatch();
  const { status, error } = useAppSelector((s) => s.vaultLookups);
  const reload = useCallback(() => void dispatch(fetchVaultSetup()), [dispatch]);

  // Fresh usage counts every time the screen opens.
  useEffect(reload, [reload]);

  return (
    <VaultLayout title="Settings" description="The lists behind every vault dropdown.">
      <p className="flex items-start gap-2 rounded-xl bg-primary/10 px-3 py-2.5 text-sm text-on-surface">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        Every dropdown in the vault is edited here — add, rename or delete items — except employees and departments, which are only listed here. An item used by an account or in the send log can't be deleted, so
        older records stay intact; rename it instead.
      </p>

      {status === 'failed' ? (
        <ErrorState message={error ?? 'Could not load the vault settings'} onRetry={reload} />
      ) : status === 'loading' || status === 'idle' ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-3" aria-busy="true" aria-label="Loading settings">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-[1rem] bg-surface-container-low" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] items-start gap-3">
          <ClientsPanel />
          <EmployeesPanel />
          <DepartmentsPanel />
          {LOOKUP_PANELS.map((def) => (
            <LookupPanel key={def.type} def={def} />
          ))}
        </div>
      )}
    </VaultLayout>
  );
}
