import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './hooks';
import { fetchTicketSettings } from '@/redux/slices/ticketSettingsSlice';
import type { TicketSettings } from '@/types/ticket';

export interface TicketSettingsAccess {
  /** May the current user see R&D tickets? Always false for customers and until loaded. */
  canSeeRnd: boolean;
  rndDepartment: TicketSettings['rndDepartment'];
  /** True once the answer is known (customers: immediately). Guards wait for this. */
  ready: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Ticket settings (R&D visibility), loaded once per signed-in employee and shared
 * by the sidebar, route guards, the ticket form and the setup page. Customers never
 * call the endpoint. The API is still the authority — it hides R&D tickets itself.
 */
export const useTicketSettings = (): TicketSettingsAccess => {
  const dispatch = useAppDispatch();
  const { userType, user } = useAppSelector((s) => s.auth);
  const { settings, loadedFor, loading, error } = useAppSelector((s) => s.ticketSettings);
  const userId = userType === 'employee' ? (user as { _id?: string } | null)?._id ?? null : null;

  useEffect(() => {
    if (userId) dispatch(fetchTicketSettings({ userId }));
  }, [dispatch, userId]);

  if (!userId) {
    return { canSeeRnd: false, rndDepartment: null, ready: true, loading: false, error: null };
  }
  const ready = loadedFor === userId && !loading;
  return {
    canSeeRnd: ready && Boolean(settings?.canSeeRnd),
    rndDepartment: settings?.rndDepartment ?? null,
    ready,
    loading,
    error,
  };
};
