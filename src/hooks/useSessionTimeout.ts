import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { logout } from '@/redux/slices/authSlice';

const TIMEOUT_MS = 30 * 60 * 1000;      // 30 minutes
const WARNING_MS = 28 * 60 * 1000;      // warn at 28 minutes
const CHECK_INTERVAL_MS = 30 * 1000;    // check every 30 seconds
const STORAGE_KEY = 'lastActivity';

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

export function useSessionTimeout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, userType } = useAppSelector((state) => state.auth);
  const warnedRef = useRef(false);
  const warnToastIdRef = useRef<string | number | undefined>(undefined);

  const resetActivity = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    // Dismiss the warning if the user becomes active again before timeout
    if (warnedRef.current) {
      warnedRef.current = false;
      if (warnToastIdRef.current !== undefined) {
        toast.dismiss(warnToastIdRef.current);
        warnToastIdRef.current = undefined;
      }
    }
  }, []);

  const doLogout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    dispatch(logout());
    toast.error('Your session has expired. Please sign in again.', { duration: 6000 });
    const loginPath = userType === 'tele_sales' ? '/tele-sales/login' : '/signin';
    navigate(loginPath, { replace: true });
  }, [dispatch, navigate, userType]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Initialise last-activity on mount if not already set
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    }

    // Attach activity listeners
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, resetActivity, { passive: true }));

    const interval = setInterval(() => {
      const last = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
      const idle = Date.now() - last;

      if (idle >= TIMEOUT_MS) {
        clearInterval(interval);
        doLogout();
      } else if (idle >= WARNING_MS && !warnedRef.current) {
        warnedRef.current = true;
        warnToastIdRef.current = toast.warning(
          'Your session will expire in 2 minutes due to inactivity.',
          { duration: 120_000 }
        );
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, resetActivity));
    };
  }, [isAuthenticated, resetActivity, doLogout]);
}
