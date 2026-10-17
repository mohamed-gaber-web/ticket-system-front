import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchVaultSetup } from '@/redux/slices/vaultLookupsSlice';

/**
 * The vault setup lists (lookups, clients, employees), loaded once per session
 * on the first vault screen that needs them. `reload` refetches all three.
 */
export function useVaultSetup() {
  const dispatch = useAppDispatch();
  const setup = useAppSelector((s) => s.vaultLookups);

  useEffect(() => {
    if (setup.status === 'idle') void dispatch(fetchVaultSetup());
  }, [dispatch, setup.status]);

  const reload = useCallback(() => void dispatch(fetchVaultSetup()), [dispatch]);
  return { ...setup, reload };
}
